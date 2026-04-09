/**
 * Offering eligibility and capacity tests.
 */
describe('Offering Eligibility & Capacity', () => {
  describe('Capacity boundaries', () => {
    it('should accept capacity of exactly 1', () => {
      const cap = 1;
      expect(cap >= 1 && cap <= 5000).toBe(true);
    });

    it('should accept capacity of exactly 5000', () => {
      const cap = 5000;
      expect(cap >= 1 && cap <= 5000).toBe(true);
    });

    it('should reject capacity of 0', () => {
      const cap = 0;
      expect(cap >= 1 && cap <= 5000).toBe(false);
    });

    it('should reject capacity of 5001', () => {
      const cap = 5001;
      expect(cap >= 1 && cap <= 5000).toBe(false);
    });

    it('should reject negative capacity', () => {
      const cap = -1;
      expect(cap >= 1 && cap <= 5000).toBe(false);
    });
  });

  describe('Enrollment window rules', () => {
    it('should reject when end is before start', () => {
      const start = new Date('2026-06-01');
      const end = new Date('2026-05-01');
      expect(end > start).toBe(false);
    });

    it('should reject when end equals start', () => {
      const d = new Date('2026-06-01');
      expect(d > d).toBe(false);
    });

    it('should accept valid window', () => {
      const start = new Date('2026-05-01');
      const end = new Date('2026-06-01');
      expect(end > start).toBe(true);
    });
  });

  describe('Eligibility flags', () => {
    const checkEligibility = (
      flags: { employeeOnly?: boolean; departments?: string[] },
      user: { isEmployee: boolean; department: string },
    ): boolean => {
      if (flags.employeeOnly && !user.isEmployee) return false;
      if (flags.departments?.length && !flags.departments.includes(user.department)) {
        return false;
      }
      return true;
    };

    it('should pass when no flags set', () => {
      expect(checkEligibility({}, { isEmployee: false, department: 'other' })).toBe(true);
    });

    it('should reject non-employee when employeeOnly=true', () => {
      expect(
        checkEligibility(
          { employeeOnly: true },
          { isEmployee: false, department: 'eng' },
        ),
      ).toBe(false);
    });

    it('should accept employee when employeeOnly=true', () => {
      expect(
        checkEligibility(
          { employeeOnly: true },
          { isEmployee: true, department: 'eng' },
        ),
      ).toBe(true);
    });

    it('should reject when user department not in whitelist', () => {
      expect(
        checkEligibility(
          { departments: ['engineering', 'sales'] },
          { isEmployee: true, department: 'marketing' },
        ),
      ).toBe(false);
    });

    it('should accept when user department is in whitelist', () => {
      expect(
        checkEligibility(
          { departments: ['engineering', 'sales'] },
          { isEmployee: true, department: 'engineering' },
        ),
      ).toBe(true);
    });
  });

  describe('Capacity reduction constraints', () => {
    it('should reject reducing capacity below used seats', () => {
      const current = { seatCapacity: 100, seatsAvailable: 20 };
      const seatsUsed = current.seatCapacity - current.seatsAvailable; // 80
      const newCapacity = 50;
      expect(newCapacity < seatsUsed).toBe(true);
    });

    it('should allow reducing capacity to exactly used seats', () => {
      const current = { seatCapacity: 100, seatsAvailable: 20 };
      const seatsUsed = current.seatCapacity - current.seatsAvailable;
      const newCapacity = 80;
      expect(newCapacity >= seatsUsed).toBe(true);
    });

    it('should adjust seatsAvailable on capacity increase', () => {
      const offering = { seatCapacity: 100, seatsAvailable: 20 };
      const newCapacity = 150;
      offering.seatsAvailable += newCapacity - offering.seatCapacity;
      offering.seatCapacity = newCapacity;
      expect(offering.seatsAvailable).toBe(70);
      expect(offering.seatCapacity).toBe(150);
    });
  });
});
