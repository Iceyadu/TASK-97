import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12;
  private readonly authTagLength = 16;

  constructor(private config: AppConfigService) {}

  encrypt(plaintext: string): string {
    const key = this.getKeyBuffer();
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, key, iv, {
      authTagLength: this.authTagLength,
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    try {
      return this.decryptWithKey(ciphertext, this.getKeyBuffer());
    } catch {
      const prevKey = this.getPreviousKeyBuffer();
      if (prevKey) {
        return this.decryptWithKey(ciphertext, prevKey);
      }
      throw new Error('Decryption failed');
    }
  }

  private decryptWithKey(ciphertext: string, key: Buffer): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = createDecipheriv(this.algorithm, key, iv, {
      authTagLength: this.authTagLength,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private getKeyBuffer(): Buffer {
    const hexKey = this.config.encryptionKey;
    if (!hexKey || hexKey.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
      );
    }
    return Buffer.from(hexKey, 'hex');
  }

  private getPreviousKeyBuffer(): Buffer | null {
    const hexKey = this.config.encryptionKeyPrevious;
    if (!hexKey || hexKey.length !== 64) return null;
    return Buffer.from(hexKey, 'hex');
  }
}
