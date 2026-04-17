import { RolesGuard } from '../../src/common/guards/roles.guard';

describe('RolesGuard', () => {
  const makeContext = (user: any) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any);

  it('returns true when no roles required', () => {
    const reflector = { getAllAndOverride: jest.fn(() => undefined) } as any;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext(null))).toBe(true);
  });

  it('throws when roles required but no user context', () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['admin']) } as any;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(makeContext(null))).toThrow('No user context');
  });

  it('allows user with matching role', () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['admin']) } as any;
    const guard = new RolesGuard(reflector);
    const allowed = guard.canActivate(
      makeContext({ userRoles: [{ role: { name: 'admin' } }] }),
    );
    expect(allowed).toBe(true);
  });
});
