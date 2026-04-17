import { ReservationsService } from '../../src/reservations/reservations.service';

describe('Offering eligibility (reservations service)', () => {
  let service: ReservationsService;

  beforeEach(() => {
    service = new ReservationsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { reservationHoldMinutes: 10 } as any,
      {} as any,
    );
  });

  it('rejects non-employee when employeeOnly eligibility is enabled', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        id: 'u1',
        employeeId: null,
        department: 'engineering',
      }),
    };
    await expect(
      (service as any).checkEligibility(
        { eligibilityFlags: { employeeOnly: true } },
        'u1',
        manager,
      ),
    ).rejects.toThrow('restricted to employees only');
  });

  it('rejects user outside allowed departments', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        id: 'u1',
        employeeId: 'EMP1',
        department: 'finance',
      }),
    };
    await expect(
      (service as any).checkEligibility(
        { eligibilityFlags: { departments: ['engineering', 'sales'] } },
        'u1',
        manager,
      ),
    ).rejects.toThrow('restricted to the following departments');
  });
});
