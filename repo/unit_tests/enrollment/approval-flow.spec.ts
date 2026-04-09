/**
 * Enrollment Approval Flow Tests
 * Tests the manual approval path: APPROVED → CONFIRMED with seat accounting.
 * Uses real EnrollmentsService with mock repositories.
 */
import { EnrollmentsService } from '../../src/enrollments/enrollments.service';
import { EnrollmentStatus } from '../../src/enrollments/enrollment.entity';

describe('EnrollmentsService – approval flow', () => {
  let service: EnrollmentsService;
  let mockEnrollmentRepo: any;
  let mockTransitionRepo: any;
  let mockIdempotencyService: any;
  let mockAuditService: any;
  let mockDataSource: any;

  // In-memory state for the transaction manager
  let enrollmentStore: Map<string, any>;
  let offeringStore: Map<string, any>;
  let transitionStore: any[];

  beforeEach(() => {
    enrollmentStore = new Map();
    offeringStore = new Map();
    transitionStore = [];

    mockIdempotencyService = {
      check: jest.fn().mockResolvedValue({ isDuplicate: false }),
      store: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditService = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };

    // Create a mock transaction manager that operates on in-memory stores
    const createMockManager = () => ({
      createQueryBuilder: jest.fn((entity, alias) => {
        const qb: any = {};
        qb._entity = entity;
        qb._conditions = {} as Record<string, any>;
        qb._lock = false;
        qb.setLock = jest.fn().mockReturnValue(qb);
        qb.where = jest.fn((condition: string, params: any) => {
          qb._conditions = { ...qb._conditions, ...params };
          return qb;
        });
        qb.andWhere = jest.fn().mockReturnValue(qb);
        qb.update = jest.fn().mockReturnValue(qb);
        qb.set = jest.fn((setObj: any) => {
          qb._setObj = setObj;
          return qb;
        });
        qb.getOne = jest.fn(() => {
          const id = qb._conditions.id;
          if (alias === 'e') return Promise.resolve(enrollmentStore.get(id) || null);
          if (alias === 'o') return Promise.resolve(offeringStore.get(id) || null);
          return Promise.resolve(null);
        });
        qb.execute = jest.fn(() => {
          const id = qb._conditions.id;
          const offering = offeringStore.get(id);
          if (offering && qb._setObj?.seatsAvailable) {
            const expr = qb._setObj.seatsAvailable();
            if (expr.includes('- 1') && offering.seatsAvailable > 0) {
              offering.seatsAvailable--;
              return Promise.resolve({ affected: 1 });
            }
            if (expr.includes('+ 1')) {
              offering.seatsAvailable++;
              return Promise.resolve({ affected: 1 });
            }
            return Promise.resolve({ affected: 0 });
          }
          return Promise.resolve({ affected: 0 });
        });
        return qb;
      }),
      create: jest.fn((Entity: any, data: any) => ({ ...data })),
      save: jest.fn((entity: any) => {
        if (entity.enrollmentId || entity.fromState) {
          transitionStore.push(entity);
        } else if (entity.id && entity.status) {
          enrollmentStore.set(entity.id, entity);
        }
        return Promise.resolve(entity);
      }),
    });

    mockDataSource = {
      transaction: jest.fn((fn: any) => fn(createMockManager())),
    };

    mockEnrollmentRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    mockTransitionRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    service = new EnrollmentsService(
      mockEnrollmentRepo,
      mockTransitionRepo,
      mockIdempotencyService,
      mockAuditService,
      mockDataSource,
    );
  });

  describe('confirmApprovedEnrollment', () => {
    it('should transition APPROVED enrollment to CONFIRMED and decrement seat', async () => {
      const enrollmentId = 'enroll-1';
      const offeringId = 'offering-1';

      enrollmentStore.set(enrollmentId, {
        id: enrollmentId,
        offeringId,
        userId: 'user-1',
        status: EnrollmentStatus.APPROVED,
        approvedAt: new Date(),
        confirmedAt: null,
      });
      offeringStore.set(offeringId, { id: offeringId, seatsAvailable: 5 });

      const result = await service.confirmApprovedEnrollment(
        enrollmentId,
        'manager-1',
        'idem-key-1',
      );

      expect(result.status).toBe(EnrollmentStatus.CONFIRMED);
      expect(result.confirmedAt).toBeInstanceOf(Date);
      expect(offeringStore.get(offeringId).seatsAvailable).toBe(4);
    });

    it('should reject if enrollment is not in APPROVED status', async () => {
      const enrollmentId = 'enroll-2';
      enrollmentStore.set(enrollmentId, {
        id: enrollmentId,
        offeringId: 'offering-2',
        status: EnrollmentStatus.WAITLISTED,
      });

      await expect(
        service.confirmApprovedEnrollment(enrollmentId, 'manager-1', 'idem-2'),
      ).rejects.toThrow('Can only confirm enrollments in APPROVED status');
    });

    it('should reject if no seats available', async () => {
      const enrollmentId = 'enroll-3';
      const offeringId = 'offering-3';

      enrollmentStore.set(enrollmentId, {
        id: enrollmentId,
        offeringId,
        status: EnrollmentStatus.APPROVED,
      });
      offeringStore.set(offeringId, { id: offeringId, seatsAvailable: 0 });

      await expect(
        service.confirmApprovedEnrollment(enrollmentId, 'manager-1', 'idem-3'),
      ).rejects.toThrow('No seats available');
    });

    it('should record state transition from APPROVED to CONFIRMED', async () => {
      const enrollmentId = 'enroll-4';
      const offeringId = 'offering-4';

      enrollmentStore.set(enrollmentId, {
        id: enrollmentId,
        offeringId,
        userId: 'user-4',
        status: EnrollmentStatus.APPROVED,
        confirmedAt: null,
      });
      offeringStore.set(offeringId, { id: offeringId, seatsAvailable: 3 });

      await service.confirmApprovedEnrollment(
        enrollmentId,
        'manager-1',
        'idem-4',
      );

      const transition = transitionStore.find(
        (t) => t.enrollmentId === enrollmentId,
      );
      expect(transition).toBeDefined();
      expect(transition.fromState).toBe('APPROVED');
      expect(transition.toState).toBe('CONFIRMED');
    });

    it('should store idempotency key after successful confirmation', async () => {
      const enrollmentId = 'enroll-5';
      const offeringId = 'offering-5';

      enrollmentStore.set(enrollmentId, {
        id: enrollmentId,
        offeringId,
        userId: 'user-5',
        status: EnrollmentStatus.APPROVED,
        confirmedAt: null,
      });
      offeringStore.set(offeringId, { id: offeringId, seatsAvailable: 2 });

      await service.confirmApprovedEnrollment(
        enrollmentId,
        'manager-1',
        'idem-5',
      );

      expect(mockIdempotencyService.store).toHaveBeenCalledWith(
        'idem-5',
        'enrollments.confirmApproved',
        'manager-1',
        200,
        expect.objectContaining({ id: enrollmentId, status: 'CONFIRMED' }),
      );
    });

    it('should return cached response for duplicate idempotency key', async () => {
      mockIdempotencyService.check.mockResolvedValueOnce({
        isDuplicate: true,
        storedResponse: {
          status: 200,
          body: { id: 'enroll-cached', status: 'CONFIRMED' },
        },
      });

      const result = await service.confirmApprovedEnrollment(
        'enroll-cached',
        'manager-1',
        'duplicate-key',
      );

      expect(result).toEqual({ id: 'enroll-cached', status: 'CONFIRMED' });
    });
  });

  describe('cancelEnrollment – seat return for APPROVED', () => {
    it('should return seat when canceling APPROVED enrollment', async () => {
      const enrollmentId = 'enroll-cancel-1';
      const offeringId = 'offering-cancel-1';

      enrollmentStore.set(enrollmentId, {
        id: enrollmentId,
        offeringId,
        userId: 'user-1',
        status: EnrollmentStatus.APPROVED,
        canceledAt: null,
        cancelReason: null,
      });
      offeringStore.set(offeringId, { id: offeringId, seatsAvailable: 3 });

      await service.cancelEnrollment(
        enrollmentId,
        'user-1',
        'cancel-idem-1',
        'Changed mind',
      );

      // Seat should be returned
      expect(offeringStore.get(offeringId).seatsAvailable).toBe(4);
    });

    it('should NOT return seat when canceling WAITLISTED enrollment', async () => {
      const enrollmentId = 'enroll-cancel-2';
      const offeringId = 'offering-cancel-2';

      enrollmentStore.set(enrollmentId, {
        id: enrollmentId,
        offeringId,
        userId: 'user-2',
        status: EnrollmentStatus.WAITLISTED,
        canceledAt: null,
        cancelReason: null,
      });
      offeringStore.set(offeringId, { id: offeringId, seatsAvailable: 0 });

      await service.cancelEnrollment(
        enrollmentId,
        'user-2',
        'cancel-idem-2',
        'No longer interested',
      );

      // Seat should NOT be returned (waitlisted never held a seat)
      expect(offeringStore.get(offeringId).seatsAvailable).toBe(0);
    });
  });
});
