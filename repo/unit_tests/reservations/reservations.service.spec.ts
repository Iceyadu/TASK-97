import { ReservationsService } from '../../src/reservations/reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationRepo: any;

  beforeEach(() => {
    reservationRepo = {
      findOne: jest.fn(),
    };
    service = new ReservationsService(
      reservationRepo,
      {} as any,
      {} as any,
      {} as any,
      { reservationHoldMinutes: 10 } as any,
      {} as any,
    );
  });

  it('findByIdForActor rejects non-owner without privileged role', async () => {
    reservationRepo.findOne.mockResolvedValue({
      id: 'r1',
      userId: 'owner-1',
    });
    await expect(
      service.findByIdForActor('r1', 'other-user', ['learner']),
    ).rejects.toThrow('Not authorized to view this reservation');
  });

  it('findByIdForActor allows admin role', async () => {
    const reservation = { id: 'r1', userId: 'owner-1' };
    reservationRepo.findOne.mockResolvedValue(reservation);
    const result = await service.findByIdForActor('r1', 'other-user', ['admin']);
    expect(result).toEqual(reservation);
  });
});
