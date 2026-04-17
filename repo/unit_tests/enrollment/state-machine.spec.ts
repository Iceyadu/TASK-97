import { EnrollmentsService } from '../../src/enrollments/enrollments.service';

describe('Enrollment state query behavior', () => {
  let service: EnrollmentsService;
  let qb: any;

  beforeEach(() => {
    qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    service = new EnrollmentsService(
      {
        createQueryBuilder: jest.fn(() => qb),
      } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('applies offering/status/user filters in findAll', async () => {
    await service.findAll({
      offeringId: 'off-1',
      status: 'WAITLISTED',
      userId: 'user-1',
      page: 2,
      pageSize: 10,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('e.offeringId = :oid', { oid: 'off-1' });
    expect(qb.andWhere).toHaveBeenCalledWith('e.status = :status', { status: 'WAITLISTED' });
    expect(qb.andWhere).toHaveBeenCalledWith('e.userId = :uid', { uid: 'user-1' });
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
  });
});
