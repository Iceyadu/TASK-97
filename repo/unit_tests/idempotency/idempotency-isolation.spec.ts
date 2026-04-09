/**
 * Idempotency Isolation Tests
 * Verifies that idempotency keys are properly scoped by endpoint and userId,
 * preventing cross-user deduplication and response leakage.
 */
import { IdempotencyService } from '../../src/idempotency/idempotency.service';

describe('IdempotencyService – isolation', () => {
  let service: IdempotencyService;
  let storedKeys: Map<string, any>;
  let mockRepo: any;
  let mockConfig: any;

  beforeEach(() => {
    storedKeys = new Map();

    mockRepo = {
      findOne: jest.fn(({ where }) => {
        // Composite lookup: key + endpoint + userId
        const compositeKey = `${where.key}|${where.endpoint}|${where.userId}`;
        const entry = storedKeys.get(compositeKey);
        return Promise.resolve(entry || null);
      }),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((data) => {
        const compositeKey = `${data.key}|${data.endpoint}|${data.userId}`;
        storedKeys.set(compositeKey, {
          ...data,
          createdAt: new Date(),
        });
        return Promise.resolve(data);
      }),
    };

    mockConfig = { idempotencyWindowHours: 24 };
    service = new IdempotencyService(mockRepo, mockConfig);
  });

  it('should NOT deduplicate same key across different users', async () => {
    // User A stores a response for key "abc" on endpoint "reservations.create"
    await service.store('abc', 'reservations.create', 'user-A', 201, {
      id: 'reservation-for-A',
    });

    // User B checks with the SAME key "abc" on the SAME endpoint
    const result = await service.check('abc', 'reservations.create', 'user-B');
    expect(result.isDuplicate).toBe(false);
  });

  it('should NOT deduplicate same key across different endpoints', async () => {
    // Store a response for key "abc" on "reservations.create" for user-A
    await service.store('abc', 'reservations.create', 'user-A', 201, {
      id: 'reservation-1',
    });

    // Same user, same key, but different endpoint
    const result = await service.check('abc', 'enrollments.confirm', 'user-A');
    expect(result.isDuplicate).toBe(false);
  });

  it('should deduplicate when key + endpoint + userId all match', async () => {
    await service.store('abc', 'reservations.create', 'user-A', 201, {
      id: 'reservation-1',
    });

    const result = await service.check(
      'abc',
      'reservations.create',
      'user-A',
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.storedResponse).toEqual({
      status: 201,
      body: { id: 'reservation-1' },
    });
  });

  it('should prevent cross-user response leakage', async () => {
    // User A creates a reservation
    await service.store('shared-key', 'reservations.create', 'user-A', 201, {
      id: 'res-A',
      userId: 'user-A',
      secret: 'sensitive-data-A',
    });

    // User B tries the same key — must NOT see User A's response
    const resultB = await service.check(
      'shared-key',
      'reservations.create',
      'user-B',
    );
    expect(resultB.isDuplicate).toBe(false);
    expect(resultB.storedResponse).toBeUndefined();
  });

  it('should scope check query to include endpoint and userId', async () => {
    await service.check('key1', 'enrollments.confirm', 'user-X');

    // Verify findOne was called with endpoint and userId in the where clause
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({
        key: 'key1',
        endpoint: 'enrollments.confirm',
        userId: 'user-X',
      }),
    });
  });
});
