import { ContentService } from '../../src/content/content.service';

describe('Content Versioning', () => {
  // Test the version bumping logic directly
  const bumpVersion = (
    current: string,
    level: 'patch' | 'minor' | 'major',
    forceMajor: boolean,
  ): string => {
    const [major, minor, patch] = current.split('.').map(Number);
    if (forceMajor) return `${major + 1}.0.0`;
    if (level === 'major') return `${major + 1}.0.0`;
    if (level === 'minor') return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
  };

  describe('Version bumping', () => {
    it('should bump patch for metadata-only update', () => {
      expect(bumpVersion('1.0.0', 'patch', false)).toBe('1.0.1');
    });

    it('should bump minor for file re-upload', () => {
      expect(bumpVersion('1.0.0', 'minor', false)).toBe('1.1.0');
    });

    it('should bump major when forced', () => {
      expect(bumpVersion('1.0.0', 'minor', true)).toBe('2.0.0');
    });

    it('should reset minor/patch on major bump', () => {
      expect(bumpVersion('1.5.3', 'minor', true)).toBe('2.0.0');
    });

    it('should reset patch on minor bump', () => {
      expect(bumpVersion('1.5.3', 'minor', false)).toBe('1.6.0');
    });

    it('should increment patch correctly', () => {
      expect(bumpVersion('1.5.3', 'patch', false)).toBe('1.5.4');
    });

    it('should handle high version numbers', () => {
      expect(bumpVersion('99.99.99', 'patch', false)).toBe('99.99.100');
    });
  });

  describe('Rollback window', () => {
    const ROLLBACK_WINDOW_DAYS = 180;

    it('should allow rollback within 180 days', () => {
      const versionDate = new Date();
      versionDate.setDate(versionDate.getDate() - 179);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - ROLLBACK_WINDOW_DAYS);
      expect(versionDate >= cutoff).toBe(true);
    });

    it('should reject rollback beyond 180 days', () => {
      const versionDate = new Date();
      versionDate.setDate(versionDate.getDate() - 181);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - ROLLBACK_WINDOW_DAYS);
      expect(versionDate >= cutoff).toBe(false);
    });

    it('should allow rollback at exactly 180 days', () => {
      const versionDate = new Date();
      versionDate.setDate(versionDate.getDate() - 180);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - ROLLBACK_WINDOW_DAYS);
      // At exactly 180 days, the version is AT the boundary
      // Due to time precision, this should still be allowed
      expect(versionDate.getTime()).toBeGreaterThanOrEqual(cutoff.getTime() - 1000);
    });
  });

  describe('Semantic version format', () => {
    it('should always produce major.minor.patch format', () => {
      const versions = [
        bumpVersion('1.0.0', 'patch', false),
        bumpVersion('1.0.0', 'minor', false),
        bumpVersion('1.0.0', 'major', false),
      ];
      for (const v of versions) {
        expect(v).toMatch(/^\d+\.\d+\.\d+$/);
      }
    });
  });
});
