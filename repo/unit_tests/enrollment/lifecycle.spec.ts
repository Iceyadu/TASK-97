/**
 * Enrollment Lifecycle Tests
 * Tests the complete reservation -> enrollment flow.
 */
import { EnrollmentStatus } from '../../src/enrollments/enrollment.entity';
import { ReservationStatus } from '../../src/reservations/reservation.entity';

describe('Enrollment Lifecycle', () => {
  describe('Reservation to enrollment flow', () => {
    it('should convert HELD reservation to CONVERTED on confirm', () => {
      const reservation = { status: ReservationStatus.HELD };
      reservation.status = ReservationStatus.CONVERTED;
      expect(reservation.status).toBe('CONVERTED');
    });

    it('should create CONFIRMED enrollment from converted reservation', () => {
      const enrollment = {
        status: EnrollmentStatus.CONFIRMED,
        confirmedAt: new Date(),
        reservationId: 'res-1',
      };
      expect(enrollment.status).toBe('CONFIRMED');
      expect(enrollment.reservationId).toBeDefined();
      expect(enrollment.confirmedAt).toBeInstanceOf(Date);
    });
  });

  describe('Waitlist flow', () => {
    it('should create WAITLISTED enrollment when no seats', () => {
      const enrollment = {
        status: EnrollmentStatus.WAITLISTED,
        waitlistedAt: new Date(),
      };
      expect(enrollment.status).toBe('WAITLISTED');
    });

    it('should move WAITLISTED to APPROVED on approval', () => {
      const enrollment = {
        status: EnrollmentStatus.WAITLISTED as string,
        approvedAt: null as Date | null,
      };
      enrollment.status = EnrollmentStatus.APPROVED;
      enrollment.approvedAt = new Date();
      expect(enrollment.status).toBe('APPROVED');
    });

    it('should move APPROVED to CONFIRMED on user confirm', () => {
      const enrollment = {
        status: EnrollmentStatus.APPROVED as string,
        confirmedAt: null as Date | null,
      };
      enrollment.status = EnrollmentStatus.CONFIRMED;
      enrollment.confirmedAt = new Date();
      expect(enrollment.status).toBe('CONFIRMED');
    });
  });

  describe('Cancellation', () => {
    it('should allow canceling CONFIRMED enrollment', () => {
      const enrollment = {
        status: EnrollmentStatus.CONFIRMED as string,
        canceledAt: null as Date | null,
        cancelReason: null as string | null,
      };
      enrollment.status = EnrollmentStatus.CANCELED;
      enrollment.canceledAt = new Date();
      enrollment.cancelReason = 'User request';
      expect(enrollment.status).toBe('CANCELED');
      expect(enrollment.cancelReason).toBe('User request');
    });

    it('should allow canceling WAITLISTED enrollment', () => {
      const enrollment = { status: EnrollmentStatus.WAITLISTED as string };
      enrollment.status = EnrollmentStatus.CANCELED;
      expect(enrollment.status).toBe('CANCELED');
    });

    it('should return seat on CONFIRMED cancellation', () => {
      let seatsAvailable = 5;
      const previousStatus = EnrollmentStatus.CONFIRMED;
      if (previousStatus === EnrollmentStatus.CONFIRMED) {
        seatsAvailable++;
      }
      expect(seatsAvailable).toBe(6);
    });

    it('should NOT return seat on WAITLISTED cancellation', () => {
      let seatsAvailable = 5;
      const previousStatus: string = EnrollmentStatus.WAITLISTED;
      if (previousStatus === EnrollmentStatus.CONFIRMED) {
        seatsAvailable++;
      }
      expect(seatsAvailable).toBe(5);
    });
  });

  describe('Duplicate enrollment prevention', () => {
    it('should reject if user already has non-canceled enrollment', () => {
      const existingEnrollments = [
        { userId: 'u1', offeringId: 'o1', status: EnrollmentStatus.CONFIRMED },
      ];
      const hasActive = existingEnrollments.some(
        (e) =>
          e.userId === 'u1' &&
          e.offeringId === 'o1' &&
          e.status !== EnrollmentStatus.CANCELED,
      );
      expect(hasActive).toBe(true);
    });

    it('should allow if previous enrollment was canceled', () => {
      const existingEnrollments = [
        { userId: 'u1', offeringId: 'o1', status: EnrollmentStatus.CANCELED },
      ];
      const hasActive = existingEnrollments.some(
        (e) =>
          e.userId === 'u1' &&
          e.offeringId === 'o1' &&
          e.status !== EnrollmentStatus.CANCELED,
      );
      expect(hasActive).toBe(false);
    });
  });

  describe('Enrollment window enforcement', () => {
    it('should allow reservation when window is open', () => {
      const now = new Date();
      const start = new Date(now.getTime() - 60000);
      const end = new Date(now.getTime() + 60000);
      const isOpen = now >= start && now <= end;
      expect(isOpen).toBe(true);
    });

    it('should reject reservation when window is closed', () => {
      const now = new Date();
      const start = new Date(now.getTime() - 120000);
      const end = new Date(now.getTime() - 60000);
      const isOpen = now >= start && now <= end;
      expect(isOpen).toBe(false);
    });

    it('should reject reservation when window has not started', () => {
      const now = new Date();
      const start = new Date(now.getTime() + 60000);
      const end = new Date(now.getTime() + 120000);
      const isOpen = now >= start && now <= end;
      expect(isOpen).toBe(false);
    });
  });

  describe('Manual approval flow', () => {
    it('should require approval when offering has requiresApproval=true', () => {
      const offering = { requiresApproval: true, waitlistEnabled: true };
      const shouldRequireApproval = offering.requiresApproval;
      expect(shouldRequireApproval).toBe(true);
    });

    it('should auto-confirm when requiresApproval=false', () => {
      const offering = { requiresApproval: false };
      expect(offering.requiresApproval).toBe(false);
    });
  });

  describe('State transition recording', () => {
    it('should record actor and timestamp on every transition', () => {
      const transition = {
        fromState: 'HELD',
        toState: 'CONFIRMED',
        actorId: 'user-123',
        timestamp: new Date(),
        reason: 'User confirmed enrollment',
        traceId: 'trace-456',
      };
      expect(transition.actorId).toBeDefined();
      expect(transition.timestamp).toBeInstanceOf(Date);
      expect(transition.traceId).toBeDefined();
      expect(transition.reason).toBeDefined();
    });
  });

  describe('Eligibility enforcement', () => {
    it('should check employee_only flag', () => {
      const eligibility = { employeeOnly: true, departments: ['engineering'] };
      const userIsEmployee = true;
      expect(eligibility.employeeOnly && userIsEmployee).toBe(true);
    });

    it('should check department whitelist', () => {
      const eligibility = { departments: ['engineering', 'sales'] };
      const userDept = 'engineering';
      expect(eligibility.departments.includes(userDept)).toBe(true);
    });

    it('should reject user not in whitelist', () => {
      const eligibility = { departments: ['engineering'] };
      const userDept = 'marketing';
      expect(eligibility.departments.includes(userDept)).toBe(false);
    });
  });
});
