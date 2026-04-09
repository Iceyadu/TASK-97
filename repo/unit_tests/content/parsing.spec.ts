import { ParsingService } from '../../src/parsed-documents/parsing.service';

describe('ParsingService', () => {
  let service: ParsingService;
  let mockParsedDocRepo: any;
  let mockFeatureRepo: any;

  beforeEach(() => {
    mockParsedDocRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'doc-' + Math.random(), ...data })),
      find: jest.fn().mockResolvedValue([]),
    };
    mockFeatureRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'feat-' + Math.random(), ...data })),
    };
    service = new ParsingService(mockParsedDocRepo, mockFeatureRepo);
  });

  describe('normalizeText', () => {
    it('should lowercase text', () => {
      expect(service.normalizeText('Hello WORLD')).toBe('hello world');
    });

    it('should collapse whitespace', () => {
      expect(service.normalizeText('hello   world')).toBe('hello world');
    });

    it('should remove punctuation', () => {
      expect(service.normalizeText('hello, world!')).toBe('hello world');
    });

    it('should trim whitespace', () => {
      expect(service.normalizeText('  hello world  ')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(service.normalizeText('')).toBe('');
    });
  });

  describe('computeContentHash', () => {
    it('should produce consistent hash for same normalized text', () => {
      const hash1 = service.computeContentHash('Hello World');
      const hash2 = service.computeContentHash('hello world');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different text', () => {
      const hash1 = service.computeContentHash('Hello World');
      const hash2 = service.computeContentHash('Goodbye World');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character hex hash (SHA-256)', () => {
      const hash = service.computeContentHash('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('parseAndStore - Plain text', () => {
    it('should split text into sections on double newlines', async () => {
      const buffer = Buffer.from('Section one.\n\nSection two.\n\nSection three.');
      const docs = await service.parseAndStore('v1', buffer, 'text/plain');
      expect(docs).toHaveLength(3);
      expect(mockParsedDocRepo.save).toHaveBeenCalledTimes(3);
    });

    it('should handle single section (no double newlines)', async () => {
      const buffer = Buffer.from('Just one section here.');
      const docs = await service.parseAndStore('v1', buffer, 'text/plain');
      expect(docs).toHaveLength(1);
    });

    it('should compute content hash for each section', async () => {
      const buffer = Buffer.from('Section one.\n\nSection two.');
      await service.parseAndStore('v1', buffer, 'text/plain');
      const savedDocs = mockParsedDocRepo.save.mock.calls;
      for (const [doc] of savedDocs) {
        expect(doc.contentHash).toBeDefined();
        expect(doc.contentHash).toHaveLength(64);
      }
    });
  });

  describe('parseAndStore - Non-text formats', () => {
    it('should return empty array for MP4', async () => {
      const buffer = Buffer.alloc(100);
      const docs = await service.parseAndStore('v1', buffer, 'video/mp4');
      expect(docs).toHaveLength(0);
    });

    it('should return empty array for MP3', async () => {
      const buffer = Buffer.alloc(100);
      const docs = await service.parseAndStore('v1', buffer, 'audio/mpeg');
      expect(docs).toHaveLength(0);
    });
  });
});
