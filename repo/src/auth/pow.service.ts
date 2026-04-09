import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { PowChallenge } from './pow-challenge.entity';
import { AppConfigService } from '../config/config.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class PowService {
  constructor(
    @InjectRepository(PowChallenge)
    private challengeRepo: Repository<PowChallenge>,
    private config: AppConfigService,
  ) {}

  async createChallenge(): Promise<{
    challengeId: string;
    prefix: string;
    difficulty: number;
    expiresAt: Date;
  }> {
    const prefix = randomBytes(16).toString('hex');
    const difficulty = this.config.powDifficulty;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const challenge = this.challengeRepo.create({
      prefix,
      difficulty,
      expiresAt,
    });
    const saved = await this.challengeRepo.save(challenge);

    return {
      challengeId: saved.id,
      prefix: saved.prefix,
      difficulty: saved.difficulty,
      expiresAt: saved.expiresAt,
    };
  }

  async validateChallenge(challengeId: string, nonce: string): Promise<boolean> {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new BadRequestException('Challenge not found');
    }

    if (challenge.consumedAt !== null) {
      throw new BadRequestException('Challenge already used');
    }

    if (challenge.expiresAt < new Date()) {
      throw new BadRequestException('Challenge expired');
    }

    // Verify the proof-of-work
    const hash = createHash('sha256')
      .update(challenge.prefix + nonce)
      .digest();

    if (!this.hasLeadingZeroBits(hash, challenge.difficulty)) {
      throw new BadRequestException('Invalid proof-of-work solution');
    }

    // Mark as consumed (single-use)
    challenge.consumedAt = new Date();
    await this.challengeRepo.save(challenge);

    return true;
  }

  /**
   * Check if a hash has the required number of leading zero bits.
   */
  hasLeadingZeroBits(hash: Buffer, requiredBits: number): boolean {
    let zeroBits = 0;
    for (let i = 0; i < hash.length && zeroBits < requiredBits; i++) {
      const byte = hash[i];
      if (byte === 0) {
        zeroBits += 8;
      } else {
        // Count leading zero bits in this byte
        for (let bit = 7; bit >= 0; bit--) {
          if ((byte & (1 << bit)) === 0) {
            zeroBits++;
          } else {
            return zeroBits >= requiredBits;
          }
        }
      }
    }
    return zeroBits >= requiredBits;
  }
}
