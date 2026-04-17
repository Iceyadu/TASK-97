import { ContentService } from '../../src/content/content.service';

describe('Content versioning (service)', () => {
  let service: ContentService;

  beforeEach(() => {
    service = new ContentService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { rollbackWindowDays: 180 } as any,
      {} as any,
      {} as any,
    );
  });

  it('bumps patch version through production helper', () => {
    const next = (service as any).bumpVersion('1.0.0', 'patch', false);
    expect(next).toBe('1.0.1');
  });

  it('bumps minor version through production helper', () => {
    const next = (service as any).bumpVersion('1.0.0', 'minor', false);
    expect(next).toBe('1.1.0');
  });

  it('forces major bump through production helper', () => {
    const next = (service as any).bumpVersion('1.5.3', 'minor', true);
    expect(next).toBe('2.0.0');
  });
});
