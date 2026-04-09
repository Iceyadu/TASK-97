import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../users/user.entity';
import { LoginAttempt } from './login-attempt.entity';
import { AppConfigService } from '../config/config.service';
import { AuditService } from '../audit/audit.service';
import { getTraceId } from '../common/interceptors/trace-id.interceptor';

@Injectable()
export class LockoutService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(LoginAttempt)
    private loginAttemptRepo: Repository<LoginAttempt>,
    private config: AppConfigService,
    private auditService: AuditService,
  ) {}

  async isLocked(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return false;
    return user.isLocked();
  }

  async checkAndLock(userId: string): Promise<boolean> {
    const windowStart = new Date(
      Date.now() - this.config.lockoutWindowMinutes * 60 * 1000,
    );

    const failedCount = await this.loginAttemptRepo.count({
      where: {
        userId,
        success: false,
        attemptedAt: MoreThan(windowStart),
      },
    });

    if (failedCount >= this.config.lockoutThreshold) {
      const lockedUntil = new Date(
        Date.now() + this.config.lockoutCooldownMinutes * 60 * 1000,
      );

      await this.userRepo.update(userId, { lockedUntil });

      await this.auditService.recordEvent({
        action: 'auth.account_locked',
        resourceType: 'users',
        resourceId: userId,
        reason: `${failedCount} failed login attempts within ${this.config.lockoutWindowMinutes} minutes`,
      });

      return true;
    }

    return false;
  }

  async unlock(userId: string, adminId: string): Promise<void> {
    await this.userRepo.update(userId, { lockedUntil: null });

    await this.auditService.recordEvent({
      action: 'auth.account_unlocked',
      resourceType: 'users',
      resourceId: userId,
      actorId: adminId,
    });
  }
}
