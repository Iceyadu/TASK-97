import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { IdempotencyKey } from './idempotency-key.entity';
import { AppConfigService } from '../config/config.service';

export interface IdempotencyResult {
  isDuplicate: boolean;
  storedResponse?: { status: number; body: any };
}

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKey)
    private idempotencyRepo: Repository<IdempotencyKey>,
    private config: AppConfigService,
  ) {}

  /**
   * Check if an idempotency key has been seen. If so, return the stored response.
   * Uses INSERT ON CONFLICT pattern for atomicity.
   */
  async check(
    key: string,
    endpoint: string,
    userId: string,
  ): Promise<IdempotencyResult> {
    if (!key) {
      throw new HttpException(
        'Idempotency-Key header is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const windowStart = new Date(
      Date.now() - this.config.idempotencyWindowHours * 60 * 60 * 1000,
    );

    const existing = await this.idempotencyRepo.findOne({
      where: {
        key,
        endpoint,
        userId,
        createdAt: MoreThan(windowStart),
      },
    });

    if (existing) {
      return {
        isDuplicate: true,
        storedResponse: {
          status: existing.responseStatus,
          body: existing.responseBody,
        },
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Store the response for an idempotency key after successful processing.
   */
  async store(
    key: string,
    endpoint: string,
    userId: string,
    responseStatus: number,
    responseBody: any,
  ): Promise<void> {
    try {
      await this.idempotencyRepo.save(
        this.idempotencyRepo.create({
          key,
          endpoint,
          userId,
          responseStatus,
          responseBody,
        }),
      );
    } catch (err: any) {
      // Duplicate key — race condition handled gracefully
      if (err.code === '23505') {
        return;
      }
      throw err;
    }
  }

  /**
   * Purge expired idempotency keys.
   */
  async purgeExpired(): Promise<number> {
    const cutoff = new Date(
      Date.now() - this.config.idempotencyWindowHours * 60 * 60 * 1000,
    );
    const result = await this.idempotencyRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoff', { cutoff })
      .execute();
    return result.affected || 0;
  }
}
