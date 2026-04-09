import { PowService } from '../../src/auth/pow.service';
import { createHash } from 'crypto';

describe('PowService', () => {
  let service: PowService;
  let mockChallengeRepo: any;
  let mockConfig: any;

  beforeEach(() => {
    mockChallengeRepo = {
      create: jest.fn((data) => ({ id: 'test-id', ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'test-id' })),
      findOne: jest.fn(),
    };
    mockConfig = {
      powDifficulty: 4, // Low difficulty for fast tests
    };
    service = new PowService(mockChallengeRepo, mockConfig);
  });

  describe('createChallenge', () => {
    it('should create a challenge with correct properties', async () => {
      const result = await service.createChallenge();
      expect(result.challengeId).toBeDefined();
      expect(result.prefix).toBeDefined();
      expect(result.prefix.length).toBe(32); // 16 bytes hex
      expect(result.difficulty).toBe(4);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('hasLeadingZeroBits', () => {
    it('should return true for hash with enough leading zeros', () => {
      // A hash of all zeros has 256 leading zero bits
      const hash = Buffer.alloc(32, 0);
      expect(service.hasLeadingZeroBits(hash, 20)).toBe(true);
    });

    it('should return false for hash without enough leading zeros', () => {
      const hash = Buffer.alloc(32, 0xff);
      expect(service.hasLeadingZeroBits(hash, 1)).toBe(false);
    });

    it('should correctly count bits in partial byte', () => {
      // 0x01 = 00000001 -> 7 leading zero bits
      const hash = Buffer.alloc(32, 0);
      hash[0] = 0x01;
      expect(service.hasLeadingZeroBits(hash, 7)).toBe(true);
      expect(service.hasLeadingZeroBits(hash, 8)).toBe(false);
    });

    it('should handle exactly matching difficulty', () => {
      // 0x00 0x10 = 8 + 3 = 11 leading zero bits
      const hash = Buffer.alloc(32, 0);
      hash[1] = 0x10; // 00010000 -> 3 leading zeros
      expect(service.hasLeadingZeroBits(hash, 11)).toBe(true);
      expect(service.hasLeadingZeroBits(hash, 12)).toBe(false);
    });
  });

  describe('validateChallenge', () => {
    it('should reject non-existent challenge', async () => {
      mockChallengeRepo.findOne.mockResolvedValue(null);
      await expect(
        service.validateChallenge('bad-id', 'nonce'),
      ).rejects.toThrow('Challenge not found');
    });

    it('should reject already consumed challenge', async () => {
      mockChallengeRepo.findOne.mockResolvedValue({
        id: 'test',
        prefix: 'abc',
        difficulty: 4,
        expiresAt: new Date(Date.now() + 60000),
        consumedAt: new Date(),
      });
      await expect(
        service.validateChallenge('test', 'nonce'),
      ).rejects.toThrow('Challenge already used');
    });

    it('should reject expired challenge', async () => {
      mockChallengeRepo.findOne.mockResolvedValue({
        id: 'test',
        prefix: 'abc',
        difficulty: 4,
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: null,
      });
      await expect(
        service.validateChallenge('test', 'nonce'),
      ).rejects.toThrow('Challenge expired');
    });

    it('should accept valid proof-of-work solution', async () => {
      const prefix = 'testprefix1234567890123456789012';
      const difficulty = 4; // 4 leading zero bits = first nibble is 0

      // Find a valid nonce
      let nonce = 0;
      let hash: Buffer;
      do {
        hash = createHash('sha256')
          .update(prefix + nonce.toString())
          .digest();
        nonce++;
      } while (!service.hasLeadingZeroBits(hash, difficulty));
      nonce--; // Went one past

      mockChallengeRepo.findOne.mockResolvedValue({
        id: 'test',
        prefix,
        difficulty,
        expiresAt: new Date(Date.now() + 60000),
        consumedAt: null,
      });

      const result = await service.validateChallenge('test', nonce.toString());
      expect(result).toBe(true);
      expect(mockChallengeRepo.save).toHaveBeenCalled();
    });

    it('should reject invalid proof-of-work solution', async () => {
      mockChallengeRepo.findOne.mockResolvedValue({
        id: 'test',
        prefix: 'specificprefix123456789012345678',
        difficulty: 32, // Very high difficulty — 'bad-nonce' won't satisfy
        expiresAt: new Date(Date.now() + 60000),
        consumedAt: null,
      });

      await expect(
        service.validateChallenge('test', 'bad-nonce'),
      ).rejects.toThrow('Invalid proof-of-work solution');
    });
  });
});
