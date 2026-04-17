import { EnrollmentsService } from '../../src/enrollments/enrollments.service';

describe('Enrollment lifecycle service behavior', () => {
  let service: EnrollmentsService;
  let enrollmentRepo: any;
  let transitionRepo: any;

  beforeEach(() => {
    enrollmentRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    };
    transitionRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    service = new EnrollmentsService(
      enrollmentRepo,
      transitionRepo,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('blocks cross-user access without privileged roles', async () => {
    enrollmentRepo.findOne.mockResolvedValue({ id: 'e1', userId: 'owner-1' });
    await expect(
      service.findByIdForActor('e1', 'other-user', ['learner']),
    ).rejects.toThrow('Not authorized to view this enrollment');
  });

  it('allows admin role to view another user enrollment', async () => {
    enrollmentRepo.findOne.mockResolvedValue({ id: 'e1', userId: 'owner-1' });
    const result = await service.findByIdForActor('e1', 'other-user', ['admin']);
    expect(result.id).toBe('e1');
  });
});
