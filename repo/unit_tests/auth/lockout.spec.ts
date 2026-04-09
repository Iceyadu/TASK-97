import { LockoutService } from '../../src/auth/lockout.service';

describe('LockoutService', () => {
  let service: LockoutService;
  let mockUserRepo: any;
  let mockLoginAttemptRepo: any;
  let mockConfig: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockUserRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    mockLoginAttemptRepo = {
      count: jest.fn(),
    };
    mockConfig = {
      lockoutThreshold: 10,
      lockoutWindowMinutes: 15,
      lockoutCooldownMinutes: 30,
    };
    mockAuditService = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };
    service = new LockoutService(
      mockUserRepo,
      mockLoginAttemptRepo,
      mockConfig,
      mockAuditService,
    );
  });

  describe('isLocked', () => {
    it('should return false if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      expect(await service.isLocked('user1')).toBe(false);
    });

    it('should return false if lockedUntil is null', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user1',
        lockedUntil: null,
        isLocked: () => false,
      });
      expect(await service.isLocked('user1')).toBe(false);
    });

    it('should return true if lockedUntil is in the future', async () => {
      const future = new Date(Date.now() + 15 * 60 * 1000);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user1',
        lockedUntil: future,
        isLocked: () => true,
      });
      expect(await service.isLocked('user1')).toBe(true);
    });

    it('should return false if lockedUntil is in the past (auto-unlock)', async () => {
      const past = new Date(Date.now() - 1000);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user1',
        lockedUntil: past,
        isLocked: () => false,
      });
      expect(await service.isLocked('user1')).toBe(false);
    });
  });

  describe('checkAndLock', () => {
    it('should not lock if failures below threshold (9 failures)', async () => {
      mockLoginAttemptRepo.count.mockResolvedValue(9);
      const locked = await service.checkAndLock('user1');
      expect(locked).toBe(false);
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('should lock if failures reach threshold (10 failures)', async () => {
      mockLoginAttemptRepo.count.mockResolvedValue(10);
      const locked = await service.checkAndLock('user1');
      expect(locked).toBe(true);
      expect(mockUserRepo.update).toHaveBeenCalledWith('user1', {
        lockedUntil: expect.any(Date),
      });
    });

    it('should lock if failures exceed threshold', async () => {
      mockLoginAttemptRepo.count.mockResolvedValue(15);
      const locked = await service.checkAndLock('user1');
      expect(locked).toBe(true);
    });

    it('should set lockout duration to 30 minutes', async () => {
      mockLoginAttemptRepo.count.mockResolvedValue(10);
      await service.checkAndLock('user1');

      const updateCall = mockUserRepo.update.mock.calls[0];
      const lockedUntil: Date = updateCall[1].lockedUntil;
      const expectedMin = Date.now() + 29 * 60 * 1000;
      const expectedMax = Date.now() + 31 * 60 * 1000;
      expect(lockedUntil.getTime()).toBeGreaterThan(expectedMin);
      expect(lockedUntil.getTime()).toBeLessThan(expectedMax);
    });

    it('should create audit event on lockout', async () => {
      mockLoginAttemptRepo.count.mockResolvedValue(10);
      await service.checkAndLock('user1');
      expect(mockAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'auth.account_locked',
          resourceId: 'user1',
        }),
      );
    });
  });

  describe('unlock', () => {
    it('should clear lockedUntil', async () => {
      await service.unlock('user1', 'admin1');
      expect(mockUserRepo.update).toHaveBeenCalledWith('user1', {
        lockedUntil: null,
      });
    });

    it('should create audit event on unlock', async () => {
      await service.unlock('user1', 'admin1');
      expect(mockAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'auth.account_unlocked',
          actorId: 'admin1',
        }),
      );
    });
  });
});
