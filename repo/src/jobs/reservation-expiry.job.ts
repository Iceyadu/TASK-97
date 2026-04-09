import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReservationsService } from '../reservations/reservations.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offering } from '../offerings/offering.entity';
import { v4 as uuidv4 } from 'uuid';
import { runWithTraceId } from '../common/interceptors/trace-id.interceptor';

@Injectable()
export class ReservationExpiryJob {
  private readonly logger = new Logger(ReservationExpiryJob.name);

  constructor(
    private reservationsService: ReservationsService,
    private enrollmentsService: EnrollmentsService,
    @InjectRepository(Offering)
    private offeringRepo: Repository<Offering>,
  ) {}

  @Cron('*/1 * * * *') // Every minute
  async handleExpiredReservations(): Promise<void> {
    const traceId = uuidv4();
    this.logger.log(`[${traceId}] Running reservation expiry job`);

    try {
      const released = await runWithTraceId(traceId, () =>
        this.reservationsService.releaseExpiredReservations(traceId),
      );
      this.logger.log(`[${traceId}] Released ${released} expired reservations`);

      // Promote waitlisted users for offerings that freed seats
      if (released > 0) {
        await this.promoteWaitlistedUsers(traceId);
      }
    } catch (err) {
      this.logger.error(
        `[${traceId}] Reservation expiry job failed: ${err}`,
      );
    }
  }

  @Cron('*/5 * * * *') // Every 5 minutes — safety sweep
  async handleWaitlistPromotion(): Promise<void> {
    const traceId = uuidv4();
    await this.promoteWaitlistedUsers(traceId);
  }

  private async promoteWaitlistedUsers(traceId: string): Promise<void> {
    const offerings = await this.offeringRepo.find({
      where: { waitlistEnabled: true },
    });

    for (const offering of offerings) {
      if (offering.seatsAvailable > 0) {
        try {
          let promoted = true;
          while (promoted && offering.seatsAvailable > 0) {
            promoted = await runWithTraceId(traceId, () =>
              this.enrollmentsService.promoteNextWaitlisted(offering.id, traceId),
            );
            if (promoted) {
              offering.seatsAvailable--;
            }
          }
        } catch {
          // Continue with other offerings
        }
      }
    }
  }
}
