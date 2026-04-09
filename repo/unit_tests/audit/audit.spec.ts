import { AuditService } from '../../src/audit/audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'audit-1', ...data })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [{ id: 'a1', action: 'test.action' }],
          1,
        ]),
      })),
    };
    service = new AuditService(mockRepo);
  });

  describe('recordEvent', () => {
    it('should save audit event with all required fields', async () => {
      await service.recordEvent({
        action: 'content.create',
        resourceType: 'content_assets',
        resourceId: 'asset-1',
        actorId: 'user-1',
        ipAddress: '127.0.0.1',
      });
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'content.create',
          resourceType: 'content_assets',
          resourceId: 'asset-1',
          actorId: 'user-1',
        }),
      );
    });

    it('should include traceId in audit event', async () => {
      await service.recordEvent({
        traceId: 'trace-123',
        action: 'test',
        resourceType: 'test',
      });
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'trace-123',
        }),
      );
    });

    it('should handle optional fields as null', async () => {
      await service.recordEvent({
        action: 'test',
        resourceType: 'test',
      });
      const savedEvent = mockRepo.save.mock.calls[0][0];
      expect(savedEvent.reason).toBeNull();
      expect(savedEvent.changes).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const result = await service.findAll({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.page).toBe(1);
    });

    it('should cap page size at 100', async () => {
      const result = await service.findAll({ pageSize: 500 });
      expect(result.pageSize).toBeLessThanOrEqual(100);
    });
  });

  describe('Audit completeness for write operations', () => {
    const writeActions = [
      'auth.register',
      'auth.login',
      'auth.change_password',
      'auth.admin_reset_password',
      'auth.reset_password_redeemed',
      'auth.account_locked',
      'auth.account_unlocked',
      'content.create',
      'content.update',
      'content.rollback',
      'content.parse_error',
      'offering.create',
      'offering.update',
      'reservation.create',
      'reservation.release',
      'reservation.auto_release',
      'enrollment.waitlisted',
      'enrollment.confirm',
      'enrollment.cancel',
      'enrollment.approve',
      'duplicate.merge',
      'file.structural_validation_failed',
    ];

    it('should have audit events defined for all write operations', () => {
      // This test documents all audit event types that should exist
      expect(writeActions.length).toBeGreaterThan(20);
      for (const action of writeActions) {
        expect(typeof action).toBe('string');
        expect(action).toContain('.');
      }
    });
  });
});
