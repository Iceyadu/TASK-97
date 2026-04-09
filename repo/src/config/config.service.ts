import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfigService {
  get dbSync(): boolean {
    return (process.env.DB_SYNC || '').toLowerCase() === 'true';
  }

  get dbHost(): string {
    return process.env.DB_HOST || 'localhost';
  }

  get dbPort(): number {
    return parseInt(process.env.DB_PORT || '5432', 10);
  }

  get dbUsername(): string {
    return process.env.DB_USERNAME || 'meridian';
  }

  get dbPassword(): string {
    return process.env.DB_PASSWORD || '';
  }

  get dbName(): string {
    return process.env.DB_NAME || 'meridian_db';
  }

  get encryptionKey(): string {
    return process.env.ENCRYPTION_KEY || '';
  }

  get encryptionKeyPrevious(): string {
    return process.env.ENCRYPTION_KEY_PREVIOUS || '';
  }

  get downloadTokenSecret(): string {
    return process.env.DOWNLOAD_TOKEN_SECRET || '';
  }

  get sessionTtlHours(): number {
    return parseInt(process.env.SESSION_TTL_HOURS || '8', 10);
  }

  get powDifficulty(): number {
    return parseInt(process.env.POW_DIFFICULTY || '20', 10);
  }

  get bcryptCostFactor(): number {
    return 12;
  }

  get fileStoragePath(): string {
    return process.env.FILE_STORAGE_PATH || '/data/files';
  }

  get maxFileSizeBytes(): number {
    return 250 * 1024 * 1024; // 250 MB
  }

  get reservationHoldMinutes(): number {
    return 10;
  }

  get idempotencyWindowHours(): number {
    return 24;
  }

  get downloadTokenExpiryMinutes(): number {
    return 15;
  }

  get loginRateLimitMax(): number {
    return 20;
  }

  get loginRateLimitWindowMs(): number {
    return 10 * 60 * 1000; // 10 minutes
  }

  get lockoutThreshold(): number {
    return 10;
  }

  get lockoutWindowMinutes(): number {
    return 15;
  }

  get lockoutCooldownMinutes(): number {
    return 30;
  }

  get rollbackWindowDays(): number {
    return 180;
  }

  get passwordHistoryCount(): number {
    return 5;
  }
}
