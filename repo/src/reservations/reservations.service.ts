import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Reservation, ReservationStatus } from './reservation.entity';
import { Offering } from '../offerings/offering.entity';
import { Enrollment, EnrollmentStatus } from '../enrollments/enrollment.entity';
import { EnrollmentStateTransition } from '../enrollments/enrollment-state-transition.entity';
import { User } from '../users/user.entity';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../config/config.service';
import { getTraceId } from '../common/interceptors/trace-id.interceptor';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepo: Repository<Reservation>,
    @InjectRepository(Offering)
    private offeringRepo: Repository<Offering>,
    private idempotencyService: IdempotencyService,
    private auditService: AuditService,
    private config: AppConfigService,
    private dataSource: DataSource,
  ) {}

  async createReservation(
    offeringId: string,
    userId: string,
    idempotencyKey: string,
  ) {
    // Check idempotency
    const idempCheck = await this.idempotencyService.check(
      idempotencyKey,
      'reservations.create',
      userId,
    );
    if (idempCheck.isDuplicate) {
      return idempCheck.storedResponse!.body;
    }

    return this.dataSource.transaction(async (manager) => {
      // Lock the offering row for update
      const offering = await manager
        .createQueryBuilder(Offering, 'o')
        .setLock('pessimistic_write')
        .where('o.id = :id', { id: offeringId })
        .getOne();

      if (!offering) {
        throw new NotFoundException('Offering not found');
      }

      if (!offering.isWindowOpen()) {
        throw new BadRequestException('Enrollment window is not open');
      }

      // Check eligibility
      await this.checkEligibility(offering, userId, manager);

      // Check for existing active reservation or enrollment
      const existingReservation = await manager.findOne(Reservation, {
        where: {
          offeringId,
          userId,
          status: ReservationStatus.HELD,
        },
      });
      if (existingReservation) {
        throw new ConflictException(
          'You already have an active reservation for this offering',
        );
      }

      const existingEnrollment = await manager
        .createQueryBuilder(Enrollment, 'e')
        .where('e.offeringId = :offeringId', { offeringId })
        .andWhere('e.userId = :userId', { userId })
        .andWhere("e.status != :canceled", { canceled: EnrollmentStatus.CANCELED })
        .getOne();
      if (existingEnrollment) {
        throw new ConflictException(
          'You are already enrolled in this offering',
        );
      }

      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + this.config.reservationHoldMinutes * 60 * 1000,
      );

      if (offering.seatsAvailable > 0) {
        // Decrement seats atomically
        await manager
          .createQueryBuilder()
          .update(Offering)
          .set({ seatsAvailable: () => '"seatsAvailable" - 1' })
          .where('id = :id AND "seatsAvailable" > 0', { id: offeringId })
          .execute();

        const reservation = manager.create(Reservation, {
          offeringId,
          userId,
          status: ReservationStatus.HELD,
          heldAt: now,
          expiresAt,
          idempotencyKey,
        });
        const saved = await manager.save(reservation);

        // Record state transition
        await manager.save(
          manager.create(EnrollmentStateTransition, {
            reservationId: saved.id,
            fromState: 'NONE',
            toState: 'HELD',
            actorId: userId,
            traceId: getTraceId(),
            reason: 'Seat reserved',
          }),
        );

        await this.auditService.recordEvent({
          action: 'reservation.create',
          resourceType: 'reservations',
          resourceId: saved.id,
          actorId: userId,
        });

        const response = {
          id: saved.id,
          offeringId: saved.offeringId,
          status: saved.status,
          heldAt: saved.heldAt,
          expiresAt: saved.expiresAt,
        };

        await this.idempotencyService.store(
          idempotencyKey,
          'reservations.create',
          userId,
          201,
          response,
        );

        return response;
      } else if (offering.waitlistEnabled) {
        // Create waitlisted enrollment directly
        const enrollment = manager.create(Enrollment, {
          offeringId,
          userId,
          status: EnrollmentStatus.WAITLISTED,
          waitlistedAt: now,
          idempotencyKey,
        });
        const saved = await manager.save(enrollment);

        await manager.save(
          manager.create(EnrollmentStateTransition, {
            enrollmentId: saved.id,
            fromState: 'NONE',
            toState: 'WAITLISTED',
            actorId: userId,
            traceId: getTraceId(),
            reason: 'No seats available, added to waitlist',
          }),
        );

        await this.auditService.recordEvent({
          action: 'enrollment.waitlisted',
          resourceType: 'enrollments',
          resourceId: saved.id,
          actorId: userId,
        });

        const response = {
          id: saved.id,
          offeringId: saved.offeringId,
          status: saved.status,
          waitlistedAt: saved.waitlistedAt,
        };

        await this.idempotencyService.store(
          idempotencyKey,
          'reservations.create',
          userId,
          201,
          response,
        );

        return response;
      } else {
        throw new HttpException(
          'No seats available and waitlist is not enabled',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    });
  }

  async releaseReservation(
    reservationId: string,
    userId: string,
    idempotencyKey: string,
    roles: string[] = [],
  ): Promise<void> {
    const idempCheck = await this.idempotencyService.check(
      idempotencyKey,
      'reservations.release',
      userId,
    );
    if (idempCheck.isDuplicate) return;

    await this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id: reservationId },
      });
      if (!reservation) throw new NotFoundException('Reservation not found');
      if (!this.canAccessUserResource(reservation.userId, userId, roles)) {
        throw new ForbiddenException('You can only release your own reservations');
      }
      if (reservation.status !== ReservationStatus.HELD) {
        throw new BadRequestException('Reservation is not in HELD status');
      }

      reservation.status = ReservationStatus.RELEASED;
      reservation.releasedAt = new Date();
      await manager.save(reservation);

      // Return seat
      await manager
        .createQueryBuilder()
        .update(Offering)
        .set({ seatsAvailable: () => '"seatsAvailable" + 1' })
        .where('id = :id', { id: reservation.offeringId })
        .execute();

      await manager.save(
        manager.create(EnrollmentStateTransition, {
          reservationId: reservation.id,
          fromState: 'HELD',
          toState: 'RELEASED',
          actorId: userId,
          traceId: getTraceId(),
          reason: 'Manual release',
        }),
      );

      await this.auditService.recordEvent({
        action: 'reservation.release',
        resourceType: 'reservations',
        resourceId: reservationId,
        actorId: userId,
      });
    });

    await this.idempotencyService.store(
      idempotencyKey,
      'reservations.release',
      userId,
      204,
      null,
    );
  }

  async findById(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepo.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async findByIdForUser(id: string, userId: string): Promise<Reservation> {
    const reservation = await this.reservationRepo.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (!this.canAccessUserResource(reservation.userId, userId)) {
      throw new ForbiddenException('You can only view your own reservations');
    }
    return reservation;
  }

  async findByIdForActor(
    id: string,
    actorId: string,
    roles: string[] = [],
  ): Promise<Reservation> {
    const reservation = await this.reservationRepo.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (!this.canAccessUserResource(reservation.userId, actorId, roles)) {
      throw new ForbiddenException('Not authorized to view this reservation');
    }
    return reservation;
  }

  private async checkEligibility(
    offering: Offering,
    userId: string,
    manager: any,
  ): Promise<void> {
    const flags = offering.eligibilityFlags;
    if (!flags || Object.keys(flags).length === 0) return;

    const user = await manager.findOne(User, { where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (flags.employeeOnly && !user.employeeId) {
      throw new BadRequestException(
        'This offering is restricted to employees only',
      );
    }

    if (flags.departments && Array.isArray(flags.departments) && flags.departments.length > 0) {
      const userDept = flags.userDepartmentField
        ? (user as any)[flags.userDepartmentField]
        : user.department;
      if (!userDept || !flags.departments.includes(userDept)) {
        throw new BadRequestException(
          `This offering is restricted to the following departments: ${flags.departments.join(', ')}`,
        );
      }
    }
  }

  /**
   * Auto-release expired reservations. Called by scheduled job.
   */
  async releaseExpiredReservations(traceId?: string): Promise<number> {
    const now = new Date();

    // Use FOR UPDATE SKIP LOCKED to prevent double-processing
    const expired = await this.dataSource
      .createQueryBuilder(Reservation, 'r')
      .setLock('pessimistic_write_or_fail')
      .where('r.status = :status', { status: ReservationStatus.HELD })
      .andWhere('r.expiresAt < :now', { now })
      .getMany()
      .catch(() => [] as Reservation[]); // SKIP LOCKED not directly available, fallback

    let released = 0;
    for (const reservation of expired) {
      const internalKey = `internal:reservations.auto_release:${reservation.id}`;
      const idemp = await this.idempotencyService.check(
        internalKey,
        'jobs.reservations.auto_release',
        SYSTEM_ACTOR_ID,
      );
      if (idemp.isDuplicate) {
        continue;
      }

      try {
        await this.dataSource.transaction(async (manager) => {
          // Re-check status inside transaction
          const current = await manager
            .createQueryBuilder(Reservation, 'r')
            .setLock('pessimistic_write')
            .where('r.id = :id AND r.status = :status', {
              id: reservation.id,
              status: ReservationStatus.HELD,
            })
            .getOne();

          if (!current) return;

          current.status = ReservationStatus.RELEASED;
          current.releasedAt = now;
          await manager.save(current);

          await manager
            .createQueryBuilder()
            .update(Offering)
            .set({ seatsAvailable: () => '"seatsAvailable" + 1' })
            .where('id = :id', { id: current.offeringId })
            .execute();

          await manager.save(
            manager.create(EnrollmentStateTransition, {
              reservationId: current.id,
              fromState: 'HELD',
              toState: 'RELEASED',
              actorId: SYSTEM_ACTOR_ID,
              traceId: traceId || getTraceId(),
              reason: 'Auto-release: hold expired',
            }),
          );

          await this.auditService.recordEvent({
            traceId: traceId || getTraceId(),
            action: 'reservation.auto_release',
            resourceType: 'reservations',
            resourceId: current.id,
            reason: 'Hold expired',
            actorId: SYSTEM_ACTOR_ID,
          });

          await this.idempotencyService.store(
            internalKey,
            'jobs.reservations.auto_release',
            SYSTEM_ACTOR_ID,
            200,
            { reservationId: current.id, released: true },
          );

          released++;
        });
      } catch {
        // Individual failures don't block others
      }
    }

    return released;
  }

  private canAccessUserResource(
    ownerUserId: string,
    actorUserId: string,
    roles: string[] = [],
  ): boolean {
    if (ownerUserId === actorUserId) {
      return true;
    }
    return roles.includes('admin') || roles.includes('enrollment_manager');
  }
}
