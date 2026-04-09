import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from '../auth/session.entity';
import { LoginAttempt } from '../auth/login-attempt.entity';
import { PowChallenge } from '../auth/pow-challenge.entity';
import { IdempotencyService } from '../idempotency/idempotency.service';

@Injectable()
export class CleanupJob {
  private readonly logger = new Logger(CleanupJob.name);

  constructor(
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
    @InjectRepository(LoginAttempt)
    private loginAttemptRepo: Repository<LoginAttempt>,
    @InjectRepository(PowChallenge)
    private powRepo: Repository<PowChallenge>,
    private idempotencyService: IdempotencyService,
  ) {}

  @Cron('0 * * * *') // Every hour — session cleanup
  async cleanupSessions(): Promise<void> {
    const now = new Date();
    const result = await this.sessionRepo.delete({
      expiresAt: LessThan(now),
    });
    this.logger.log(`Cleaned ${result.affected} expired sessions`);
  }

  @Cron('0 * * * *') // Every hour — login attempt cleanup
  async cleanupLoginAttempts(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.loginAttemptRepo.delete({
      attemptedAt: LessThan(cutoff),
    });
    this.logger.log(`Cleaned ${result.affected} old login attempts`);
  }

  @Cron('0 * * * *') // Every hour — PoW challenge cleanup
  async cleanupPowChallenges(): Promise<void> {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const result = await this.powRepo.delete({
      expiresAt: LessThan(cutoff),
    });
    this.logger.log(`Cleaned ${result.affected} expired PoW challenges`);
  }

  @Cron('0 */6 * * *') // Every 6 hours — idempotency key purge
  async purgeIdempotencyKeys(): Promise<void> {
    const purged = await this.idempotencyService.purgeExpired();
    this.logger.log(`Purged ${purged} expired idempotency keys`);
  }
}
