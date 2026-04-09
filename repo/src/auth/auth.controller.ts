import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { PowService } from './pow.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username must be alphanumeric with underscores' })
  username: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName: string;

  @IsString()
  challengeId: string;

  @IsString()
  nonce: string;
}

class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  challengeId?: string;

  @IsOptional()
  @IsString()
  nonce?: string;
}

class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(12)
  newPassword: string;
}

class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(12)
  newPassword: string;

  @IsString()
  challengeId: string;

  @IsString()
  nonce: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly powService: PowService,
    private readonly rateLimitGuard: RateLimitGuard,
  ) {}

  @Public()
  @Get('challenge')
  async getChallenge() {
    return this.powService.createChallenge();
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    await this.powService.validateChallenge(dto.challengeId, dto.nonce);
    return this.authService.register({
      username: dto.username,
      password: dto.password,
      displayName: dto.displayName,
    });
  }

  @Public()
  @Post('login')
  @UseGuards(RateLimitGuard)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    // Check if PoW required (after 3 failures for the account)
    if (dto.challengeId && dto.nonce) {
      await this.powService.validateChallenge(dto.challengeId, dto.nonce);
    }

    return this.authService.login(dto.username, dto.password, ip, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request) {
    const token = req.headers.authorization?.slice(7);
    if (token) {
      await this.authService.logout(token);
    }
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.powService.validateChallenge(dto.challengeId, dto.nonce);
    await this.authService.redeemResetToken(dto.token, dto.newPassword);
  }
}
