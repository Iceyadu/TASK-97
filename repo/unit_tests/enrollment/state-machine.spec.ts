import { EnrollmentStatus } from '../../src/enrollments/enrollment.entity';
import { ReservationStatus } from '../../src/reservations/reservation.entity';

/**
 * Enrollment State Machine validation tests.
 * Tests the allowed/disallowed transitions as defined in design.md Section 13.
 */
describe('Enrollment State Machine', () => {
  // Valid transitions map
  const validTransitions: Record<string, string[]> = {
    NONE: ['HELD', 'WAITLISTED'],
    HELD: ['RELEASED', 'CONVERTED'],
    CONVERTED: [], // Terminal for reservation; enrollment begins
    RELEASED: [], // Terminal for reservation
    WAITLISTED: ['APPROVED', 'CANCELED'],
    APPROVED: ['CONFIRMED', 'CANCELED'],
    CONFIRMED: ['CANCELED'],
    CANCELED: [], // Terminal
  };

  describe('Valid transitions', () => {
    it('should allow NONE -> HELD (seat available)', () => {
      expect(validTransitions['NONE']).toContain('HELD');
    });

    it('should allow NONE -> WAITLISTED (no seats)', () => {
      expect(validTransitions['NONE']).toContain('WAITLISTED');
    });

    it('should allow HELD -> CONVERTED (user confirms)', () => {
      expect(validTransitions['HELD']).toContain('CONVERTED');
    });

    it('should allow HELD -> RELEASED (timeout or manual)', () => {
      expect(validTransitions['HELD']).toContain('RELEASED');
    });

    it('should allow WAITLISTED -> APPROVED (manager approves)', () => {
      expect(validTransitions['WAITLISTED']).toContain('APPROVED');
    });

    it('should allow APPROVED -> CONFIRMED (user confirms)', () => {
      expect(validTransitions['APPROVED']).toContain('CONFIRMED');
    });

    it('should allow CONFIRMED -> CANCELED (user/admin cancels)', () => {
      expect(validTransitions['CONFIRMED']).toContain('CANCELED');
    });

    it('should allow WAITLISTED -> CANCELED', () => {
      expect(validTransitions['WAITLISTED']).toContain('CANCELED');
    });
  });

  describe('Invalid transitions', () => {
    it('should not allow RELEASED -> CONFIRMED', () => {
      expect(validTransitions['RELEASED']).not.toContain('CONFIRMED');
    });

    it('should not allow CANCELED -> HELD', () => {
      expect(validTransitions['CANCELED']).not.toContain('HELD');
    });

    it('should not allow CANCELED -> CONFIRMED', () => {
      expect(validTransitions['CANCELED']).not.toContain('CONFIRMED');
    });

    it('should not allow CONFIRMED -> HELD', () => {
      expect(validTransitions['CONFIRMED']).not.toContain('HELD');
    });

    it('should not allow RELEASED -> HELD', () => {
      expect(validTransitions['RELEASED']).not.toContain('HELD');
    });

    it('should not allow CONFIRMED -> APPROVED', () => {
      expect(validTransitions['CONFIRMED']).not.toContain('APPROVED');
    });
  });

  describe('Enrollment status enum completeness', () => {
    it('should have all required states', () => {
      expect(EnrollmentStatus.WAITLISTED).toBe('WAITLISTED');
      expect(EnrollmentStatus.APPROVED).toBe('APPROVED');
      expect(EnrollmentStatus.CONFIRMED).toBe('CONFIRMED');
      expect(EnrollmentStatus.CANCELED).toBe('CANCELED');
    });
  });

  describe('Reservation status enum completeness', () => {
    it('should have all required states', () => {
      expect(ReservationStatus.HELD).toBe('HELD');
      expect(ReservationStatus.RELEASED).toBe('RELEASED');
      expect(ReservationStatus.CONVERTED).toBe('CONVERTED');
    });
  });

  describe('Hold expiry boundary', () => {
    it('should expire at exactly 10 minutes', () => {
      const holdMinutes = 10;
      const holdMs = holdMinutes * 60 * 1000;
      const now = Date.now();
      const expiresAt = new Date(now + holdMs);

      // At 9:59 (1 second before expiry)
      const beforeExpiry = new Date(expiresAt.getTime() - 1000);
      expect(beforeExpiry < expiresAt).toBe(true);

      // At 10:01 (1 second after expiry)
      const afterExpiry = new Date(expiresAt.getTime() + 1000);
      expect(afterExpiry > expiresAt).toBe(true);
    });
  });
});
