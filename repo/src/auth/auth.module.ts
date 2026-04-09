import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { Session } from './session.entity';
import { LoginAttempt } from './login-attempt.entity';
import { PasswordHistory } from './password-history.entity';
import { PowChallenge } from './pow-challenge.entity';
import { CredentialResetToken } from './credential-reset-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PowService } from './pow.service';
import { LockoutService } from './lockout.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      LoginAttempt,
      PasswordHistory,
      PowChallenge,
      CredentialResetToken,
      User,
    ]),
  ],
  providers: [
    AuthService,
    PowService,
    LockoutService,
    RateLimitGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, LockoutService, RateLimitGuard],
})
export class AuthModule {}
