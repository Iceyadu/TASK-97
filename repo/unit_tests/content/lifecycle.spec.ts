import { ContentService } from '../../src/content/content.service';

describe('Content lifecycle rollback checks', () => {
  let service: ContentService;
  let assetRepo: any;
  let versionRepo: any;

  beforeEach(() => {
    assetRepo = {
      findOne: jest.fn(),
    };
    versionRepo = {
      findOne: jest.fn(),
    };
    service = new ContentService(
      assetRepo,
      versionRepo,
      {} as any,
      {} as any,
      {} as any,
      { rollbackWindowDays: 180 } as any,
      { recordEvent: jest.fn().mockResolvedValue(undefined) } as any,
      { transaction: jest.fn() } as any,
    );
  });

  it('rejects rollback when target version is missing for asset', async () => {
    assetRepo.findOne.mockResolvedValue({ id: 'asset-1' });
    versionRepo.findOne.mockResolvedValue(null);
    await expect(service.rollback('asset-1', 'v-missing', 'user-1')).rejects.toThrow(
      'Target version not found for this asset',
    );
  });

  it('rejects rollback when target is older than rollback window', async () => {
    assetRepo.findOne.mockResolvedValue({ id: 'asset-1' });
    versionRepo.findOne.mockResolvedValue({
      id: 'old-version',
      createdAt: new Date(Date.now() - 181 * 24 * 60 * 60 * 1000),
    });
    await expect(service.rollback('asset-1', 'old-version', 'user-1')).rejects.toThrow(
      'Cannot rollback to version older than 180 days',
    );
  });
});
