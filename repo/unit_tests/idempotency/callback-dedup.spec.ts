/**
 * Tests for duplicate internal callback handling.
 * Verifies that scheduled jobs (seat release, waitlist promotion)
 * don't double-process when triggered by both timer and manual action.
 */
import { IdempotencyService } from '../../src/idempotency/idempotency.service';

describe('Duplicate Internal Callback Deduplication', () => {
  let service: IdempotencyService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn((data: any) => data),
      save: jest.fn((data: any) => Promise.resolve(data)),
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      })),
    };
    service = new IdempotencyService(mockRepo, {
      idempotencyWindowHours: 24,
    } as any);
  });

  it('should allow first callback for seat-release-{id}', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    const result = await service.check(
      'seat-release-res-123',
      'reservations.auto_release',
      'system',
    );
    expect(result.isDuplicate).toBe(false);
  });

  it('should block duplicate callback for same seat-release-{id}', async () => {
    mockRepo.findOne.mockResolvedValue({
      key: 'seat-release-res-123',
      responseStatus: 200,
      responseBody: { released: true },
    });
    const result = await service.check(
      'seat-release-res-123',
      'reservations.auto_release',
      'system',
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.storedResponse!.body).toEqual({ released: true });
  });

  it('should allow first waitlist-promote callback', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    const result = await service.check(
      'waitlist-promote-enr-456-off-789',
      'enrollments.promote',
      'system',
    );
    expect(result.isDuplicate).toBe(false);
  });

  it('should block duplicate waitlist-promote callback', async () => {
    mockRepo.findOne.mockResolvedValue({
      key: 'waitlist-promote-enr-456-off-789',
      responseStatus: 200,
      responseBody: { promoted: true },
    });
    const result = await service.check(
      'waitlist-promote-enr-456-off-789',
      'enrollments.promote',
      'system',
    );
    expect(result.isDuplicate).toBe(true);
  });

  it('should store callback outcome for future deduplication', async () => {
    await service.store(
      'seat-release-res-999',
      'reservations.auto_release',
      'system',
      200,
      { released: true },
    );
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'seat-release-res-999',
        endpoint: 'reservations.auto_release',
      }),
    );
  });

  it('should handle concurrent store attempts gracefully', async () => {
    // Simulate unique constraint violation on concurrent insert
    mockRepo.save.mockRejectedValueOnce({ code: '23505' });
    await expect(
      service.store('dup-key', 'test', 'user', 200, {}),
    ).resolves.toBeUndefined();
  });
});
