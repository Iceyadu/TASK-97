import { EncryptionService } from '../../src/encryption/encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let mockConfig: any;

  const validKey = 'a'.repeat(64); // 64 hex chars = 32 bytes

  beforeEach(() => {
    mockConfig = {
      encryptionKey: validKey,
      encryptionKeyPrevious: '',
    };
    service = new EncryptionService(mockConfig);
  });

  describe('encrypt/decrypt round-trip', () => {
    it('should encrypt and decrypt successfully', () => {
      const plaintext = 'sensitive data here';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same input (random IV)', () => {
      const plaintext = 'same data';
      const enc1 = service.encrypt(plaintext);
      const enc2 = service.encrypt(plaintext);
      expect(enc1).not.toBe(enc2); // Different IVs
    });

    it('should handle empty string', () => {
      const encrypted = service.encrypt('');
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle unicode text', () => {
      const plaintext = 'Ünïcödé 日本語 中文';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('ciphertext format', () => {
    it('should produce format iv:authTag:ciphertext', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      // Each part should be base64
      for (const part of parts) {
        expect(() => Buffer.from(part, 'base64')).not.toThrow();
      }
    });
  });

  describe('key rotation', () => {
    it('should decrypt with previous key when current fails', () => {
      const oldKey = 'b'.repeat(64);
      const oldConfig = {
        encryptionKey: oldKey,
        encryptionKeyPrevious: '',
      } as any;
      const oldService = new EncryptionService(oldConfig);
      const encrypted = oldService.encrypt('secret');

      // New service with rotated key
      const newConfig = {
        encryptionKey: validKey,
        encryptionKeyPrevious: oldKey,
      } as any;
      const newService = new EncryptionService(newConfig);

      const decrypted = newService.decrypt(encrypted);
      expect(decrypted).toBe('secret');
    });

    it('should fail if neither key works', () => {
      const wrongConfig = {
        encryptionKey: 'c'.repeat(64),
        encryptionKeyPrevious: '',
      } as any;
      const wrongService = new EncryptionService(wrongConfig);

      const encrypted = service.encrypt('test');
      expect(() => wrongService.decrypt(encrypted)).toThrow();
    });
  });

  describe('key validation', () => {
    it('should throw if encryption key is wrong length', () => {
      const badConfig = {
        encryptionKey: 'tooshort',
        encryptionKeyPrevious: '',
      } as any;
      const badService = new EncryptionService(badConfig);
      expect(() => badService.encrypt('test')).toThrow(
        'ENCRYPTION_KEY must be a 64-character hex string',
      );
    });
  });
});
