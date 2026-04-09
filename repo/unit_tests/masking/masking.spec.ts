import { maskObject, maskLastFour } from '../../src/common/interceptors/masking.interceptor';

describe('Masking', () => {
  describe('maskLastFour', () => {
    it('should mask all but last 4 characters', () => {
      expect(maskLastFour('123456789')).toBe('*****6789');
    });

    it('should mask short strings entirely', () => {
      expect(maskLastFour('abc')).toBe('****');
    });

    it('should handle empty string', () => {
      expect(maskLastFour('')).toBe('****');
    });

    it('should handle exactly 4 characters', () => {
      expect(maskLastFour('1234')).toBe('****');
    });

    it('should handle 5 characters', () => {
      expect(maskLastFour('12345')).toBe('*5678'.replace('5678', '2345'));
      // Actually: '*2345'
      expect(maskLastFour('12345')).toBe('*2345');
    });
  });

  describe('maskObject', () => {
    it('should strip password_hash entirely', () => {
      const input = { id: '1', username: 'test', password_hash: 'hashed' };
      const result = maskObject(input);
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.username).toBe('test');
    });

    it('should strip passwordHash entirely', () => {
      const input = { id: '1', passwordHash: 'hashed' };
      const result = maskObject(input);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should mask governmentId', () => {
      const input = { governmentId: '123456789' };
      const result = maskObject(input);
      expect(result.governmentId).toBe('*****6789');
    });

    it('should mask employeeId', () => {
      const input = { employeeId: 'EMP123456' };
      const result = maskObject(input);
      expect(result.employeeId).toBe('*****3456');
    });

    it('should handle nested objects', () => {
      const input = {
        user: { id: '1', passwordHash: 'hashed', governmentId: '123456789' },
      };
      const result = maskObject(input);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.governmentId).toBe('*****6789');
    });

    it('should handle arrays', () => {
      const input = [
        { id: '1', passwordHash: 'hash1' },
        { id: '2', passwordHash: 'hash2' },
      ];
      const result = maskObject(input);
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(result[1]).not.toHaveProperty('passwordHash');
    });

    it('should pass through null/undefined', () => {
      expect(maskObject(null)).toBeNull();
      expect(maskObject(undefined)).toBeUndefined();
    });

    it('should pass through primitives', () => {
      expect(maskObject('string')).toBe('string');
      expect(maskObject(42)).toBe(42);
    });

    it('should strip reset_token_hash', () => {
      const input = { reset_token_hash: 'secret', name: 'test' };
      const result = maskObject(input);
      expect(result).not.toHaveProperty('reset_token_hash');
      expect(result.name).toBe('test');
    });
  });
});
