import { ReservationExpiryJob } from '../../src/jobs/reservation-expiry.job';
import { ContentParsingJob } from '../../src/jobs/content-parsing.job';
import { CleanupJob } from '../../src/jobs/cleanup.job';

describe('Jobs', () => {
  it('reservation expiry job triggers release flow', async () => {
    const job = new ReservationExpiryJob(
      {
        releaseExpiredReservations: jest.fn().mockResolvedValue(0),
      } as any,
      {
        promoteNextWaitlisted: jest.fn(),
      } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
    );
    await job.handleExpiredReservations();
  });

  it('content parsing job handles pending list', async () => {
    const versionRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const job = new ContentParsingJob(
      versionRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await job.parseUnprocessedContent();
    expect(versionRepo.find).toHaveBeenCalled();
  });

  it('cleanup job purges sessions/login attempts/pow/idempotency', async () => {
    const sessionRepo = { delete: jest.fn().mockResolvedValue({ affected: 1 }) };
    const loginAttemptRepo = { delete: jest.fn().mockResolvedValue({ affected: 1 }) };
    const powRepo = { delete: jest.fn().mockResolvedValue({ affected: 1 }) };
    const idempotencyService = { purgeExpired: jest.fn().mockResolvedValue(1) };

    const job = new CleanupJob(
      sessionRepo as any,
      loginAttemptRepo as any,
      powRepo as any,
      idempotencyService as any,
    );
    await job.cleanupSessions();
    await job.cleanupLoginAttempts();
    await job.cleanupPowChallenges();
    await job.purgeIdempotencyKeys();
    expect(sessionRepo.delete).toHaveBeenCalled();
    expect(loginAttemptRepo.delete).toHaveBeenCalled();
    expect(powRepo.delete).toHaveBeenCalled();
    expect(idempotencyService.purgeExpired).toHaveBeenCalled();
  });
});
