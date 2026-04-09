import { DownloadTokenService } from '../../src/files/download-token.service';

describe('DownloadTokenService', () => {
  let service: DownloadTokenService;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      downloadTokenSecret: 'a'.repeat(64), // 64 hex chars = 32 bytes
      downloadTokenExpiryMinutes: 15,
    };
    service = new DownloadTokenService(mockConfig);
  });

  describe('generateToken', () => {
    it('should generate a token with correct structure', () => {
      const result = service.generateToken('asset1', 'version1', 'user1');
      expect(result.downloadToken).toBeDefined();
      expect(result.downloadToken).toContain('.');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should set expiry to approximately 15 minutes from now', () => {
      const before = Date.now();
      const result = service.generateToken('asset1', 'version1', 'user1');
      const after = Date.now();

      const expectedMin = before + 14 * 60 * 1000;
      const expectedMax = after + 16 * 60 * 1000;
      expect(result.expiresAt.getTime()).toBeGreaterThan(expectedMin);
      expect(result.expiresAt.getTime()).toBeLessThan(expectedMax);
    });
  });

  describe('validateToken', () => {
    it('should validate a freshly generated token', () => {
      const { downloadToken } = service.generateToken(
        'asset1',
        'version1',
        'user1',
      );
      const payload = service.validateToken(downloadToken);
      expect(payload.assetId).toBe('asset1');
      expect(payload.versionId).toBe('version1');
      expect(payload.userId).toBe('user1');
    });

    it('should reject token with invalid signature', () => {
      const { downloadToken } = service.generateToken(
        'asset1',
        'version1',
        'user1',
      );
      const tampered = downloadToken.slice(0, -5) + 'XXXXX';
      expect(() => service.validateToken(tampered)).toThrow('Invalid download token signature');
    });

    it('should reject token with invalid format', () => {
      expect(() => service.validateToken('no-dots-here')).toThrow(
        'Invalid download token format',
      );
    });

    it('should reject expired token', () => {
      // Create a token that was already expired by manipulating the payload
      const { downloadToken } = service.generateToken(
        'asset1',
        'version1',
        'user1',
      );
      // Tamper with the expiry by creating a token with past expiry using a custom approach
      // Instead, test by generating with -1 minute expiry
      const expiredConfig = { ...mockConfig, downloadTokenExpiryMinutes: -1 };
      const expiredService = new DownloadTokenService(expiredConfig);
      const { downloadToken: expiredToken } = expiredService.generateToken(
        'asset1',
        'version1',
        'user1',
      );
      expect(() => expiredService.validateToken(expiredToken)).toThrow(
        'Download token has expired',
      );
    });

    it('should reject token signed with different secret', () => {
      const otherConfig = {
        ...mockConfig,
        downloadTokenSecret: 'b'.repeat(64),
      };
      const otherService = new DownloadTokenService(otherConfig);
      const { downloadToken } = otherService.generateToken(
        'asset1',
        'version1',
        'user1',
      );

      expect(() => service.validateToken(downloadToken)).toThrow(
        'Invalid download token signature',
      );
    });
  });
});
