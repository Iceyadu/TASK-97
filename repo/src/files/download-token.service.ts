import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { createHmac } from 'crypto';

interface DownloadTokenPayload {
  assetId: string;
  versionId: string;
  userId: string;
  expiresAt: number; // epoch ms
}

@Injectable()
export class DownloadTokenService {
  constructor(private config: AppConfigService) {}

  generateToken(
    assetId: string,
    versionId: string,
    userId: string,
  ): { downloadToken: string; expiresAt: Date } {
    const expiresAt = Date.now() + this.config.downloadTokenExpiryMinutes * 60 * 1000;

    const payload: DownloadTokenPayload = {
      assetId,
      versionId,
      userId,
      expiresAt,
    };

    const payloadStr = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadStr).toString('base64');
    const signature = this.sign(payloadB64);

    const token = `${payloadB64}.${signature}`;

    return {
      downloadToken: token,
      expiresAt: new Date(expiresAt),
    };
  }

  validateToken(token: string): DownloadTokenPayload {
    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid download token format');
    }

    const [payloadB64, signature] = parts;
    const expectedSig = this.sign(payloadB64);

    if (signature !== expectedSig) {
      throw new UnauthorizedException('Invalid download token signature');
    }

    const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf8');
    let payload: DownloadTokenPayload;
    try {
      payload = JSON.parse(payloadStr);
    } catch {
      throw new UnauthorizedException('Invalid download token payload');
    }

    if (Date.now() > payload.expiresAt) {
      throw new UnauthorizedException('Download token has expired');
    }

    return payload;
  }

  private sign(data: string): string {
    return createHmac('sha256', this.config.downloadTokenSecret)
      .update(data)
      .digest('base64url');
  }
}
