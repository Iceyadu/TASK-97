import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Session } from './session.entity';
import { LoginAttempt } from './login-attempt.entity';
import { PasswordHistory } from './password-history.entity';
import { CredentialResetToken } from './credential-reset-token.entity';
import { User } from '../users/user.entity';
import { AppConfigService } from '../config/config.service';
import { LockoutService } from './lockout.service';
import {
  validatePasswordComplexity,
  assertPasswordComplexity,
} from '../common/validators/password.validator';
import { AuditService } from '../audit/audit.service';
import { getTraceId } from '../common/interceptors/trace-id.interceptor';
import { createHash } from 'crypto';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
    @InjectRepository(LoginAttempt)
    private loginAttemptRepo: Repository<LoginAttempt>,
    @InjectRepository(PasswordHistory)
    private passwordHistoryRepo: Repository<PasswordHistory>,
    @InjectRepository(CredentialResetToken)
    private resetTokenRepo: Repository<CredentialResetToken>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private config: AppConfigService,
    private lockoutService: LockoutService,
    private auditService: AuditService,
    private encryptionService: EncryptionService,
  ) {}

  async register(data: {
    username: string;
    password: string;
    displayName: string;
  }): Promise<{ id: string; username: string; displayName: string; createdAt: Date }> {
    assertPasswordComplexity(data.password);

    const existing = await this.userRepo.findOne({
      where: { username: data.username },
    });
    if (existing) {
      throw new HttpException('Username already taken', HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(
      data.password,
      this.config.bcryptCostFactor,
    );

    const encryptedPasswordHash = this.encryptAtRest(passwordHash);

    const user = this.userRepo.create({
      username: data.username,
      passwordHash: encryptedPasswordHash,
      displayName: data.displayName,
      isActive: true,
    });
    const saved = await this.userRepo.save(user);

    // Store initial password in history
    await this.passwordHistoryRepo.save(
      this.passwordHistoryRepo.create({
        userId: saved.id,
        passwordHash: encryptedPasswordHash,
      }),
    );

    await this.auditService.recordEvent({
      action: 'auth.register',
      resourceType: 'users',
      resourceId: saved.id,
      actorId: saved.id,
    });

    return {
      id: saved.id,
      username: saved.username,
      displayName: saved.displayName,
      createdAt: saved.createdAt,
    };
  }

  async login(
    username: string,
    password: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<{
    token: string;
    expiresAt: Date;
    user: { id: string; username: string; displayName: string; roles: string[] };
  }> {
    const user = await this.userRepo.findOne({
      where: { username },
      relations: ['userRoles', 'userRoles.role'],
    });

    // Check lockout BEFORE password verification (avoid timing attacks)
    if (user) {
      const isLocked = await this.lockoutService.isLocked(user.id);
      if (isLocked) {
        await this.recordLoginAttempt(user.id, ipAddress, false);
        throw new HttpException(
          'Account is temporarily locked. Please try again later.',
          423,
        );
      }
    }

    if (!user || !user.isActive) {
      await this.recordLoginAttempt(null, ipAddress, false);
      throw new UnauthorizedException('Invalid credentials');
    }

    const storedPasswordHash = this.decryptAtRest(user.passwordHash);
    const passwordValid = await bcrypt.compare(password, storedPasswordHash);
    if (!passwordValid) {
      await this.recordLoginAttempt(user.id, ipAddress, false);
      await this.lockoutService.checkAndLock(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login — reset failure counter
    await this.recordLoginAttempt(user.id, ipAddress, true);

    const token = uuidv4();
    const expiresAt = new Date(
      Date.now() + this.config.sessionTtlHours * 60 * 60 * 1000,
    );

    await this.sessionRepo.save(
      this.sessionRepo.create({
        userId: user.id,
        token,
        expiresAt,
        ipAddress,
        userAgent: userAgent || null,
      }),
    );

    await this.auditService.recordEvent({
      action: 'auth.login',
      resourceType: 'sessions',
      actorId: user.id,
      ipAddress,
    });

    const roles = (user.userRoles || []).map((ur) => ur.role?.name).filter(Boolean);

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        roles: roles as string[],
      },
    };
  }

  async logout(token: string): Promise<void> {
    await this.sessionRepo.delete({ token });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    assertPasswordComplexity(newPassword);

    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });

    const currentValid = await bcrypt.compare(
      currentPassword,
      this.decryptAtRest(user.passwordHash),
    );
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check password history
    await this.checkPasswordHistory(userId, newPassword);

    const newHash = await bcrypt.hash(newPassword, this.config.bcryptCostFactor);
    user.passwordHash = this.encryptAtRest(newHash);
    await this.userRepo.save(user);

    await this.passwordHistoryRepo.save(
      this.passwordHistoryRepo.create({
        userId,
        passwordHash: this.encryptAtRest(newHash),
      }),
    );

    // Invalidate all other sessions
    await this.sessionRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId })
      .execute();

    await this.auditService.recordEvent({
      action: 'auth.change_password',
      resourceType: 'users',
      resourceId: userId,
      actorId: userId,
    });
  }

  async adminResetPassword(
    adminId: string,
    targetUserId: string,
  ): Promise<{ resetToken: string; expiresAt: Date }> {
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const rawToken = uuidv4();
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.resetTokenRepo.save(
      this.resetTokenRepo.create({
        userId: targetUserId,
        tokenHash,
        expiresAt,
      }),
    );

    await this.auditService.recordEvent({
      action: 'auth.admin_reset_password',
      resourceType: 'users',
      resourceId: targetUserId,
      actorId: adminId,
    });

    return { resetToken: rawToken, expiresAt };
  }

  async redeemResetToken(
    rawToken: string,
    newPassword: string,
  ): Promise<void> {
    assertPasswordComplexity(newPassword);

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const resetToken = await this.resetTokenRepo.findOne({
      where: {
        tokenHash,
        consumedAt: undefined as any, // IsNull
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is actually null (not consumed) and not expired
    if (resetToken.consumedAt !== null) {
      throw new BadRequestException('Reset token has already been used');
    }

    await this.checkPasswordHistory(resetToken.userId, newPassword);

    const newHash = await bcrypt.hash(newPassword, this.config.bcryptCostFactor);

    const user = await this.userRepo.findOneOrFail({
      where: { id: resetToken.userId },
    });
    user.passwordHash = this.encryptAtRest(newHash);
    user.lockedUntil = null; // Unlock on reset
    await this.userRepo.save(user);

    resetToken.consumedAt = new Date();
    await this.resetTokenRepo.save(resetToken);

    await this.passwordHistoryRepo.save(
      this.passwordHistoryRepo.create({
        userId: resetToken.userId,
        passwordHash: this.encryptAtRest(newHash),
      }),
    );

    // Invalidate all sessions
    await this.sessionRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId: resetToken.userId })
      .execute();

    await this.auditService.recordEvent({
      action: 'auth.reset_password_redeemed',
      resourceType: 'users',
      resourceId: resetToken.userId,
    });
  }

  async getFailedAttemptCount(userId: string): Promise<number> {
    const windowStart = new Date(
      Date.now() - this.config.lockoutWindowMinutes * 60 * 1000,
    );
    return this.loginAttemptRepo.count({
      where: {
        userId,
        success: false,
        attemptedAt: MoreThan(windowStart),
      },
    });
  }

  private async recordLoginAttempt(
    userId: string | null,
    ipAddress: string,
    success: boolean,
  ): Promise<void> {
    await this.loginAttemptRepo.save(
      this.loginAttemptRepo.create({ userId, ipAddress, success }),
    );
  }

  private async checkPasswordHistory(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const history = await this.passwordHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: this.config.passwordHistoryCount,
    });

    for (const entry of history) {
      const matches = await bcrypt.compare(
        newPassword,
        this.decryptAtRest(entry.passwordHash),
      );
      if (matches) {
        throw new BadRequestException(
          `Password was recently used. Choose a different password.`,
        );
      }
    }
  }

  private encryptAtRest(value: string): string {
    return this.encryptionService.encrypt(value);
  }

  private decryptAtRest(value: string): string {
    try {
      return this.encryptionService.decrypt(value);
    } catch {
      // Backward-compatible fallback for already persisted plaintext hashes.
      return value;
    }
  }
}
