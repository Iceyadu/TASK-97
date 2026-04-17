import { AuthService } from '../../src/auth/auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let sessionRepo: any;
  let userRepo: any;

  beforeEach(() => {
    const loginAttemptRepo: any = {
      save: jest.fn(),
      create: jest.fn((v?: any) => v),
      count: jest.fn(),
    };
    const passwordHistoryRepo: any = {
      save: jest.fn(),
      create: jest.fn((v?: any) => v),
      find: jest.fn(),
    };
    const resetTokenRepo: any = {
      save: jest.fn(),
      create: jest.fn((v?: any) => v),
      findOne: jest.fn(),
    };
    sessionRepo = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn(),
      create: jest.fn((v) => v),
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      })),
    };
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
      findOneOrFail: jest.fn(),
    };
    service = new AuthService(
      sessionRepo,
      loginAttemptRepo,
      passwordHistoryRepo,
      resetTokenRepo,
      userRepo,
      {
        bcryptCostFactor: 12,
        sessionTtlHours: 8,
        lockoutWindowMinutes: 15,
        passwordHistoryCount: 3,
      } as any,
      { isLocked: jest.fn(), checkAndLock: jest.fn() } as any,
      { recordEvent: jest.fn().mockResolvedValue(undefined) } as any,
      { encrypt: jest.fn((v) => `enc:${v}`), decrypt: jest.fn((v) => v) } as any,
    );
  });

  it('logout deletes session by token', async () => {
    await service.logout('token-123');
    expect(sessionRepo.delete).toHaveBeenCalledWith({ token: 'token-123' });
  });

  it('register rejects duplicate username', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'u1', username: 'taken' });
    await expect(
      service.register({
        username: 'taken',
        password: 'P@ssw0rd!Strong123',
        displayName: 'Taken',
      }),
    ).rejects.toThrow('Username already taken');
  });
});
