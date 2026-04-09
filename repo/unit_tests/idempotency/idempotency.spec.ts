import { IdempotencyService } from '../../src/idempotency/idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let mockRepo: any;
  let mockConfig: any;

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      })),
    };
    mockConfig = {
      idempotencyWindowHours: 24,
    };
    service = new IdempotencyService(mockRepo, mockConfig);
  });

  describe('check', () => {
    it('should throw if key is empty', async () => {
      await expect(
        service.check('', 'endpoint', 'user1'),
      ).rejects.toThrow('Idempotency-Key header is required');
    });

    it('should return isDuplicate=false for new key', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.check('key1', 'endpoint', 'user1');
      expect(result.isDuplicate).toBe(false);
    });

    it('should return isDuplicate=true with stored response for existing key', async () => {
      mockRepo.findOne.mockResolvedValue({
        key: 'key1',
        responseStatus: 201,
        responseBody: { id: 'res1' },
      });
      const result = await service.check('key1', 'endpoint', 'user1');
      expect(result.isDuplicate).toBe(true);
      expect(result.storedResponse).toEqual({
        status: 201,
        body: { id: 'res1' },
      });
    });
  });

  describe('store', () => {
    it('should store the response for a key', async () => {
      await service.store('key1', 'endpoint', 'user1', 201, { id: 'res1' });
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'key1',
          endpoint: 'endpoint',
          userId: 'user1',
          responseStatus: 201,
          responseBody: { id: 'res1' },
        }),
      );
    });

    it('should handle duplicate key gracefully (constraint violation)', async () => {
      mockRepo.save.mockRejectedValueOnce({ code: '23505' });
      // Should not throw
      await expect(
        service.store('key1', 'endpoint', 'user1', 201, {}),
      ).resolves.toBeUndefined();
    });

    it('should rethrow non-duplicate errors', async () => {
      mockRepo.save.mockRejectedValueOnce(new Error('DB connection failed'));
      await expect(
        service.store('key1', 'endpoint', 'user1', 201, {}),
      ).rejects.toThrow('DB connection failed');
    });
  });

  describe('purgeExpired', () => {
    it('should return count of purged keys', async () => {
      const result = await service.purgeExpired();
      expect(result).toBe(5);
    });
  });
});
