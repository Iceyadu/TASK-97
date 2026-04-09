import { RateLimitGuard } from '../../src/common/guards/rate-limit.guard';
import { ExecutionContext, HttpException } from '@nestjs/common';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let mockConfig: any;

  const createMockContext = (ip: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ ip, connection: { remoteAddress: ip } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  beforeEach(() => {
    mockConfig = {
      loginRateLimitMax: 20,
      loginRateLimitWindowMs: 10 * 60 * 1000,
    };
    guard = new RateLimitGuard(mockConfig);
  });

  afterEach(() => {
    guard.clearStore();
  });

  it('should allow first request', () => {
    expect(guard.canActivate(createMockContext('1.2.3.4'))).toBe(true);
  });

  it('should allow up to 20 requests from same IP', () => {
    for (let i = 0; i < 20; i++) {
      expect(guard.canActivate(createMockContext('1.2.3.4'))).toBe(true);
    }
  });

  it('should reject 21st request from same IP within window', () => {
    for (let i = 0; i < 20; i++) {
      guard.canActivate(createMockContext('1.2.3.4'));
    }
    expect(() =>
      guard.canActivate(createMockContext('1.2.3.4')),
    ).toThrow(HttpException);
  });

  it('should allow requests from different IPs independently', () => {
    for (let i = 0; i < 20; i++) {
      guard.canActivate(createMockContext('1.2.3.4'));
    }
    // Different IP should still work
    expect(guard.canActivate(createMockContext('5.6.7.8'))).toBe(true);
  });

  it('should track attempt count correctly', () => {
    for (let i = 0; i < 5; i++) {
      guard.canActivate(createMockContext('1.2.3.4'));
    }
    expect(guard.getAttemptCount('1.2.3.4')).toBe(5);
  });

  it('should return 429 status code on limit exceeded', () => {
    for (let i = 0; i < 20; i++) {
      guard.canActivate(createMockContext('1.2.3.4'));
    }
    try {
      guard.canActivate(createMockContext('1.2.3.4'));
      fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(429);
    }
  });
});
