import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Enrollment, EnrollmentStatus } from './enrollment.entity';
import { EnrollmentStateTransition } from './enrollment-state-transition.entity';
import { Reservation, ReservationStatus } from '../reservations/reservation.entity';
import { Offering } from '../offerings/offering.entity';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { AuditService } from '../audit/audit.service';
import { getTraceId } from '../common/interceptors/trace-id.interceptor';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(EnrollmentStateTransition)
    private transitionRepo: Repository<EnrollmentStateTransition>,
    private idempotencyService: IdempotencyService,
    private auditService: AuditService,
    private dataSource: DataSource,
  ) {}

  async confirmReservation(
    reservationId: string,
    userId: string,
    idempotencyKey: string,
  ) {
    const idempCheck = await this.idempotencyService.check(
      idempotencyKey,
      'enrollments.confirm',
      userId,
    );
    if (idempCheck.isDuplicate) {
      return idempCheck.storedResponse!.body;
    }

    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager
        .createQueryBuilder(Reservation, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id: reservationId })
        .getOne();

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      if (reservation.userId !== userId) {
        throw new BadRequestException('Reservation does not belong to you');
      }

      if (reservation.status !== ReservationStatus.HELD) {
        throw new BadRequestException('Reservation is not in HELD status');
      }

      if (reservation.expiresAt < new Date()) {
        throw new HttpException(
          'Reservation has expired',
          HttpStatus.GONE,
        );
      }

      // Check for duplicate enrollment
      const existingEnrollment = await manager
        .createQueryBuilder(Enrollment, 'e')
        .where('e.offeringId = :offeringId', {
          offeringId: reservation.offeringId,
        })
        .andWhere('e.userId = :userId', { userId })
        .andWhere("e.status != :canceled", {
          canceled: EnrollmentStatus.CANCELED,
        })
        .getOne();

      if (existingEnrollment) {
        throw new ConflictException(
          'You are already enrolled in this offering',
        );
      }

      // Load the offering to check requiresApproval
      const offering = await manager
        .createQueryBuilder(Offering, 'o')
        .where('o.id = :id', { id: reservation.offeringId })
        .getOne();

      // Convert reservation
      reservation.status = ReservationStatus.CONVERTED;
      await manager.save(reservation);

      // Determine enrollment status based on approval requirement
      const needsApproval = offering?.requiresApproval === true;
      const enrollmentStatus = needsApproval
        ? EnrollmentStatus.APPROVED
        : EnrollmentStatus.CONFIRMED;

      // Create enrollment
      const enrollment = manager.create(Enrollment, {
        offeringId: reservation.offeringId,
        userId,
        reservationId,
        status: enrollmentStatus,
        approvedAt: needsApproval ? new Date() : null,
        confirmedAt: needsApproval ? null : new Date(),
        idempotencyKey,
      });
      const saved = await manager.save(enrollment);

      // Record transitions
      await manager.save(
        manager.create(EnrollmentStateTransition, {
          reservationId,
          fromState: 'HELD',
          toState: 'CONVERTED',
          actorId: userId,
          traceId: getTraceId(),
          reason: 'Reservation confirmed',
        }),
      );
      await manager.save(
        manager.create(EnrollmentStateTransition, {
          enrollmentId: saved.id,
          fromState: 'NONE',
          toState: enrollmentStatus,
          actorId: userId,
          traceId: getTraceId(),
          reason: needsApproval
            ? 'Enrollment pending approval'
            : 'Enrollment confirmed from reservation',
        }),
      );

      await this.auditService.recordEvent({
        action: 'enrollment.confirm',
        resourceType: 'enrollments',
        resourceId: saved.id,
        actorId: userId,
      });

      const response = {
        id: saved.id,
        offeringId: saved.offeringId,
        status: saved.status,
        confirmedAt: saved.confirmedAt,
      };

      await this.idempotencyService.store(
        idempotencyKey,
        'enrollments.confirm',
        userId,
        201,
        response,
      );

      return response;
    });
  }

  async cancelEnrollment(
    enrollmentId: string,
    userId: string,
    idempotencyKey: string,
    reason?: string,
    roles: string[] = [],
  ) {
    const idempCheck = await this.idempotencyService.check(
      idempotencyKey,
      'enrollments.cancel',
      userId,
    );
    if (idempCheck.isDuplicate) {
      return idempCheck.storedResponse!.body;
    }

    return this.dataSource.transaction(async (manager) => {
      const enrollment = await manager
        .createQueryBuilder(Enrollment, 'e')
        .setLock('pessimistic_write')
        .where('e.id = :id', { id: enrollmentId })
        .getOne();

      if (!enrollment) {
        throw new NotFoundException('Enrollment not found');
      }

      if (!this.canAccessUserResource(enrollment.userId, userId, roles)) {
        throw new ForbiddenException('You can only cancel your own enrollments');
      }

      if (enrollment.status === EnrollmentStatus.CANCELED) {
        throw new BadRequestException('Enrollment is already canceled');
      }

      const previousStatus = enrollment.status;
      enrollment.status = EnrollmentStatus.CANCELED;
      enrollment.canceledAt = new Date();
      enrollment.cancelReason = reason || null;
      await manager.save(enrollment);

      // Return seat if was confirmed or approved (seat was reserved at hold time)
      if (
        previousStatus === EnrollmentStatus.CONFIRMED ||
        previousStatus === EnrollmentStatus.APPROVED
      ) {
        await manager
          .createQueryBuilder()
          .update(Offering)
          .set({ seatsAvailable: () => '"seatsAvailable" + 1' })
          .where('id = :id', { id: enrollment.offeringId })
          .execute();
      }

      await manager.save(
        manager.create(EnrollmentStateTransition, {
          enrollmentId: enrollment.id,
          fromState: previousStatus,
          toState: 'CANCELED',
          actorId: userId,
          traceId: getTraceId(),
          reason: reason || 'Enrollment canceled',
        }),
      );

      await this.auditService.recordEvent({
        action: 'enrollment.cancel',
        resourceType: 'enrollments',
        resourceId: enrollmentId,
        actorId: userId,
      });

      const response = {
        id: enrollment.id,
        offeringId: enrollment.offeringId,
        status: enrollment.status,
        canceledAt: enrollment.canceledAt,
      };

      await this.idempotencyService.store(
        idempotencyKey,
        'enrollments.cancel',
        userId,
        200,
        response,
      );

      return response;
    });
  }

  async approveEnrollment(
    enrollmentId: string,
    actorId: string,
    reason?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const enrollment = await manager
        .createQueryBuilder(Enrollment, 'e')
        .setLock('pessimistic_write')
        .where('e.id = :id', { id: enrollmentId })
        .getOne();

      if (!enrollment) throw new NotFoundException('Enrollment not found');
      if (enrollment.status !== EnrollmentStatus.WAITLISTED) {
        throw new BadRequestException('Can only approve waitlisted enrollments');
      }

      enrollment.status = EnrollmentStatus.APPROVED;
      enrollment.approvedAt = new Date();
      await manager.save(enrollment);

      await manager.save(
        manager.create(EnrollmentStateTransition, {
          enrollmentId: enrollment.id,
          fromState: 'WAITLISTED',
          toState: 'APPROVED',
          actorId,
          traceId: getTraceId(),
          reason: reason || 'Enrollment approved',
        }),
      );

      await this.auditService.recordEvent({
        action: 'enrollment.approve',
        resourceType: 'enrollments',
        resourceId: enrollmentId,
        actorId,
      });

      return enrollment;
    });
  }

  /**
   * Confirm an approved enrollment (APPROVED → CONFIRMED).
   * This completes the manual approval flow and decrements the seat.
   */
  async confirmApprovedEnrollment(
    enrollmentId: string,
    actorId: string,
    idempotencyKey: string,
  ) {
    const idempCheck = await this.idempotencyService.check(
      idempotencyKey,
      'enrollments.confirmApproved',
      actorId,
    );
    if (idempCheck.isDuplicate) {
      return idempCheck.storedResponse!.body;
    }

    return this.dataSource.transaction(async (manager) => {
      const enrollment = await manager
        .createQueryBuilder(Enrollment, 'e')
        .setLock('pessimistic_write')
        .where('e.id = :id', { id: enrollmentId })
        .getOne();

      if (!enrollment) throw new NotFoundException('Enrollment not found');
      if (enrollment.status !== EnrollmentStatus.APPROVED) {
        throw new BadRequestException(
          'Can only confirm enrollments in APPROVED status',
        );
      }

      // Seat was already decremented when the reservation was held. Only decrement
      // here for APPROVED enrollments that did not consume a seat at reservation time
      // (e.g. waitlist → approve path).
      const seatAlreadyHeldAtReservation =
        enrollment.reservationId != null;

      if (!seatAlreadyHeldAtReservation) {
        const seatResult = await manager
          .createQueryBuilder()
          .update(Offering)
          .set({ seatsAvailable: () => '"seatsAvailable" - 1' })
          .where('id = :id AND "seatsAvailable" > 0', {
            id: enrollment.offeringId,
          })
          .execute();

        if (seatResult.affected === 0) {
          throw new ConflictException('No seats available for this offering');
        }
      }

      enrollment.status = EnrollmentStatus.CONFIRMED;
      enrollment.confirmedAt = new Date();
      await manager.save(enrollment);

      await manager.save(
        manager.create(EnrollmentStateTransition, {
          enrollmentId: enrollment.id,
          fromState: 'APPROVED',
          toState: 'CONFIRMED',
          actorId,
          traceId: getTraceId(),
          reason: 'Approved enrollment confirmed',
        }),
      );

      await this.auditService.recordEvent({
        action: 'enrollment.confirmApproved',
        resourceType: 'enrollments',
        resourceId: enrollmentId,
        actorId,
      });

      const response = {
        id: enrollment.id,
        offeringId: enrollment.offeringId,
        status: enrollment.status,
        confirmedAt: enrollment.confirmedAt,
      };

      await this.idempotencyService.store(
        idempotencyKey,
        'enrollments.confirmApproved',
        actorId,
        200,
        response,
      );

      return response;
    });
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    offeringId?: string;
    status?: string;
    userId?: string;
  }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);

    const qb = this.enrollmentRepo.createQueryBuilder('e');
    if (query.offeringId) qb.andWhere('e.offeringId = :oid', { oid: query.offeringId });
    if (query.status) qb.andWhere('e.status = :status', { status: query.status });
    if (query.userId) qb.andWhere('e.userId = :uid', { uid: query.userId });

    qb.orderBy('e.createdAt', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findById(id: string): Promise<Enrollment & { transitions?: EnrollmentStateTransition[] }> {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const transitions = await this.transitionRepo.find({
      where: { enrollmentId: id },
      order: { timestamp: 'ASC' },
    });

    return { ...enrollment, transitions };
  }

  async findByIdForUser(id: string, userId: string): Promise<Enrollment & { transitions?: EnrollmentStateTransition[] }> {
    return this.findByIdForActor(id, userId);
  }

  async findByIdForActor(
    id: string,
    actorId: string,
    roles: string[] = [],
  ): Promise<Enrollment & { transitions?: EnrollmentStateTransition[] }> {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (!this.canAccessUserResource(enrollment.userId, actorId, roles)) {
      throw new ForbiddenException('Not authorized to view this enrollment');
    }

    const transitions = await this.transitionRepo.find({
      where: { enrollmentId: id },
      order: { timestamp: 'ASC' },
    });

    return { ...enrollment, transitions };
  }

  /**
   * Promote next waitlisted user for an offering. Called by job.
   */
  async promoteNextWaitlisted(offeringId: string, traceId?: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const offering = await manager
        .createQueryBuilder(Offering, 'o')
        .setLock('pessimistic_write')
        .where('o.id = :id', { id: offeringId })
        .getOne();

      if (!offering || offering.seatsAvailable <= 0) return false;

      const next = await manager
        .createQueryBuilder(Enrollment, 'e')
        .setLock('pessimistic_write')
        .where('e.offeringId = :oid AND e.status = :status', {
          oid: offeringId,
          status: EnrollmentStatus.WAITLISTED,
        })
        .orderBy('e.waitlistedAt', 'ASC')
        .getOne();

      if (!next) return false;

      const internalKey = `internal:enrollments.promote_waitlist:${next.id}`;
      const idemp = await this.idempotencyService.check(
        internalKey,
        'jobs.enrollments.promote_waitlist',
        '00000000-0000-0000-0000-000000000000',
      );
      if (idemp.isDuplicate) {
        return false;
      }

      if (offering.requiresApproval) {
        next.status = EnrollmentStatus.APPROVED;
        next.approvedAt = new Date();
      } else {
        next.status = EnrollmentStatus.CONFIRMED;
        next.confirmedAt = new Date();
        // Decrement seat
        await manager
          .createQueryBuilder()
          .update(Offering)
          .set({ seatsAvailable: () => '"seatsAvailable" - 1' })
          .where('id = :id', { id: offeringId })
          .execute();
      }
      await manager.save(next);

      await manager.save(
        manager.create(EnrollmentStateTransition, {
          enrollmentId: next.id,
          fromState: 'WAITLISTED',
          toState: next.status,
          actorId: '00000000-0000-0000-0000-000000000000',
          traceId: traceId || getTraceId(),
          reason: 'Auto-promoted from waitlist',
        }),
      );

      await this.auditService.recordEvent({
        traceId: traceId || getTraceId(),
        action: 'enrollment.auto_promote',
        resourceType: 'enrollments',
        resourceId: next.id,
        actorId: '00000000-0000-0000-0000-000000000000',
        reason: 'Auto-promoted from waitlist',
      });

      await this.idempotencyService.store(
        internalKey,
        'jobs.enrollments.promote_waitlist',
        '00000000-0000-0000-0000-000000000000',
        200,
        { enrollmentId: next.id, promoted: true },
      );

      return true;
    });
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
