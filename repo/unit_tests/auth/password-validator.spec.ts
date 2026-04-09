import {
  validatePasswordComplexity,
  assertPasswordComplexity,
} from '../../src/common/validators/password.validator';

describe('Password Validator', () => {
  describe('validatePasswordComplexity', () => {
    it('should accept a valid password with all requirements', () => {
      const result = validatePasswordComplexity('MyP@ssw0rd123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 12 characters', () => {
      const result = validatePasswordComplexity('Short1!aB');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 12 characters long',
      );
    });

    it('should accept exactly 12 character password meeting all rules', () => {
      const result = validatePasswordComplexity('Abcdefgh1!23');
      expect(result.valid).toBe(true);
    });

    it('should reject 11 character password', () => {
      const result = validatePasswordComplexity('Abcdefgh1!2');
      expect(result.valid).toBe(false);
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordComplexity('mypassw0rd123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordComplexity('MYPASSW0RD123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter',
      );
    });

    it('should reject password without digit', () => {
      const result = validatePasswordComplexity('MyPasswordHere!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one digit',
      );
    });

    it('should reject password without special character', () => {
      const result = validatePasswordComplexity('MyPassword123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character',
      );
    });

    it('should report multiple errors at once', () => {
      const result = validatePasswordComplexity('short');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept passwords with various special characters', () => {
      const chars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];
      for (const char of chars) {
        const pwd = `Abcdefgh123${char}`;
        const result = validatePasswordComplexity(pwd);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject empty string', () => {
      const result = validatePasswordComplexity('');
      expect(result.valid).toBe(false);
    });
  });

  describe('assertPasswordComplexity', () => {
    it('should not throw for valid password', () => {
      expect(() => assertPasswordComplexity('ValidP@ss123!')).not.toThrow();
    });

    it('should throw BadRequestException for invalid password', () => {
      expect(() => assertPasswordComplexity('short')).toThrow();
    });
  });
});
