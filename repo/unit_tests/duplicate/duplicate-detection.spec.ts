import { DuplicateDetectionService } from '../../src/duplicate-detection/duplicate-detection.service';

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;

  beforeEach(() => {
    // Create service with mock repos — only test the pure logic methods
    service = new DuplicateDetectionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('generateShingles', () => {
    it('should generate correct 5-word shingles', () => {
      const text = 'the quick brown fox jumps over the lazy dog';
      const shingles = service.generateShingles(text);
      expect(shingles.size).toBe(5); // 9 words - 5 + 1 = 5 shingles
      expect(shingles.has('the quick brown fox jumps')).toBe(true);
      expect(shingles.has('quick brown fox jumps over')).toBe(true);
    });

    it('should handle text shorter than shingle size', () => {
      const shingles = service.generateShingles('one two three');
      expect(shingles.size).toBe(0);
    });

    it('should handle exactly shingle-size text', () => {
      const shingles = service.generateShingles('one two three four five');
      expect(shingles.size).toBe(1);
    });

    it('should lowercase text for shingles', () => {
      const shingles = service.generateShingles(
        'The Quick Brown Fox Jumps',
      );
      expect(shingles.has('the quick brown fox jumps')).toBe(true);
    });
  });

  describe('computeMinHash', () => {
    it('should produce signature of correct length', () => {
      const shingles = new Set(['a b c d e', 'b c d e f']);
      const minHash = service.computeMinHash(shingles);
      expect(minHash).toHaveLength(128);
    });

    it('should produce consistent signature for same input', () => {
      const shingles = new Set(['a b c d e', 'b c d e f']);
      const sig1 = service.computeMinHash(shingles);
      const sig2 = service.computeMinHash(shingles);
      expect(sig1).toEqual(sig2);
    });
  });

  describe('estimateJaccard', () => {
    it('should return 1.0 for identical signatures', () => {
      const sig = [1, 2, 3, 4, 5];
      expect(service.estimateJaccard(sig, sig)).toBe(1.0);
    });

    it('should return 0.0 for completely different signatures', () => {
      const sig1 = [1, 2, 3, 4, 5];
      const sig2 = [6, 7, 8, 9, 10];
      expect(service.estimateJaccard(sig1, sig2)).toBe(0.0);
    });

    it('should return correct ratio for partial overlap', () => {
      const sig1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sig2 = [1, 2, 3, 4, 5, 11, 12, 13, 14, 15];
      expect(service.estimateJaccard(sig1, sig2)).toBe(0.5);
    });
  });

  describe('Near-duplicate threshold', () => {
    it('should flag documents with >= 0.8 similarity', () => {
      const threshold = 0.8;
      const sig1 = new Array(128).fill(0).map((_, i) => i);
      const sig2 = new Array(128).fill(0).map((_, i) => (i < 103 ? i : i + 1000));
      // 103/128 ≈ 0.805
      const similarity = service.estimateJaccard(sig1, sig2);
      expect(similarity).toBeGreaterThanOrEqual(threshold);
    });

    it('should not flag documents with < 0.8 similarity', () => {
      const threshold = 0.8;
      const sig1 = new Array(128).fill(0).map((_, i) => i);
      const sig2 = new Array(128).fill(0).map((_, i) => (i < 90 ? i : i + 1000));
      // 90/128 ≈ 0.703
      const similarity = service.estimateJaccard(sig1, sig2);
      expect(similarity).toBeLessThan(threshold);
    });
  });
});
