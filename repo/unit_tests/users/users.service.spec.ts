import { UsersService } from '../../src/users/users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repo: any;
  let encryption: any;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      save: jest.fn((v) => Promise.resolve(v)),
    };
    encryption = {
      encrypt: jest.fn((v) => `enc:${v}`),
      decrypt: jest.fn((v) => v.replace(/^enc:/, '')),
    };
    service = new UsersService(repo, encryption);
  });

  it('findById throws when user not found', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findById('u1')).rejects.toThrow('User not found');
  });

  it('updateProfile encrypts sensitive fields before save', async () => {
    repo.findOne.mockResolvedValue({
      id: 'u1',
      username: 'user1',
      displayName: 'User One',
      department: null,
      governmentId: null,
      employeeId: null,
      userRoles: [],
    });
    await service.updateProfile('u1', {
      governmentId: 'GOV123',
      employeeId: 'EMP123',
      department: 'eng',
    });
    const saved = repo.save.mock.calls[0][0];
    expect(saved.governmentId).toBe('GOV123');
    expect(saved.employeeId).toBe('EMP123');
    expect(saved.department).toBe('eng');
  });
});
