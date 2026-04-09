import { FileValidatorService } from '../../src/files/file-validator.service';

describe('FileValidatorService', () => {
  let service: FileValidatorService;
  let mockConfig: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockConfig = {
      maxFileSizeBytes: 250 * 1024 * 1024,
    };
    mockAuditService = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };
    service = new FileValidatorService(mockConfig, mockAuditService);
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal sequences', () => {
      const result = service.sanitizeFilename('../../etc/passwd');
      expect(result).toMatch(/^[a-f0-9]{8}_etc_passwd$/);
    });

    it('should remove null bytes', () => {
      const result = service.sanitizeFilename('file\0name.pdf');
      expect(result).toMatch(/^[a-f0-9]{8}_filename\.pdf$/);
    });

    it('should replace spaces with underscores', () => {
      const result = service.sanitizeFilename('my file name.pdf');
      expect(result).toMatch(/^[a-f0-9]{8}_my_file_name\.pdf$/);
    });

    it('should remove control characters', () => {
      const result = service.sanitizeFilename('file\x01name.pdf');
      expect(result).toMatch(/^[a-f0-9]{8}_filename\.pdf$/);
    });

    it('should truncate to 255 characters', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const result = service.sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255 + 9); // 9 = uuid prefix + underscore
      expect(result.endsWith('.pdf')).toBe(true);
    });

    it('should handle empty filename', () => {
      const result = service.sanitizeFilename('');
      expect(result).toMatch(/^[a-f0-9]{8}_unnamed_file$/);
    });

    it('should strip backslash path traversal', () => {
      const result = service.sanitizeFilename('..\\windows\\system32');
      expect(result).toMatch(/^[a-f0-9]{8}_windows_system32$/);
    });

    it('should prefix with UUID for collision prevention', () => {
      const result = service.sanitizeFilename('test.pdf');
      expect(result).toMatch(/^[a-f0-9]{8}_test\.pdf$/);
    });
  });

  describe('validateExtension', () => {
    it('should accept .epub', () => {
      expect(service.validateExtension('book.epub')).toBe('.epub');
    });

    it('should accept .pdf', () => {
      expect(service.validateExtension('doc.pdf')).toBe('.pdf');
    });

    it('should accept .txt', () => {
      expect(service.validateExtension('notes.txt')).toBe('.txt');
    });

    it('should accept .mp4', () => {
      expect(service.validateExtension('video.mp4')).toBe('.mp4');
    });

    it('should accept .mp3', () => {
      expect(service.validateExtension('audio.mp3')).toBe('.mp3');
    });

    it('should reject .exe', () => {
      expect(() => service.validateExtension('malware.exe')).toThrow();
    });

    it('should reject .js', () => {
      expect(() => service.validateExtension('script.js')).toThrow();
    });

    it('should reject .html', () => {
      expect(() => service.validateExtension('page.html')).toThrow();
    });

    it('should reject .zip (not in allowlist)', () => {
      expect(() => service.validateExtension('archive.zip')).toThrow();
    });

    it('should be case-insensitive', () => {
      expect(service.validateExtension('DOC.PDF')).toBe('.pdf');
    });
  });

  describe('validateSize', () => {
    it('should accept file at 249 MB', () => {
      expect(() =>
        service.validateSize(249 * 1024 * 1024),
      ).not.toThrow();
    });

    it('should accept file at exactly 250 MB', () => {
      expect(() =>
        service.validateSize(250 * 1024 * 1024),
      ).not.toThrow();
    });

    it('should reject file at 251 MB', () => {
      expect(() =>
        service.validateSize(251 * 1024 * 1024),
      ).toThrow();
    });

    it('should accept empty file (0 bytes)', () => {
      expect(() => service.validateSize(0)).not.toThrow();
    });
  });

  describe('validateMagicBytes', () => {
    it('should validate PDF magic bytes', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 content here');
      expect(() =>
        service.validateMagicBytes(pdfBuffer, '.pdf'),
      ).not.toThrow();
    });

    it('should reject wrong magic bytes for PDF', () => {
      const fakeBuffer = Buffer.from('This is not a PDF');
      expect(() =>
        service.validateMagicBytes(fakeBuffer, '.pdf'),
      ).toThrow();
    });

    it('should validate EPUB (ZIP) magic bytes', () => {
      const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
      expect(() =>
        service.validateMagicBytes(zipBuffer, '.epub'),
      ).not.toThrow();
    });

    it('should validate MP3 with ID3 tag', () => {
      const mp3Buffer = Buffer.from('ID3' + '\x00'.repeat(100));
      expect(() =>
        service.validateMagicBytes(mp3Buffer, '.mp3'),
      ).not.toThrow();
    });

    it('should skip validation for .txt (no magic bytes defined)', () => {
      const txtBuffer = Buffer.from('Hello world');
      expect(() =>
        service.validateMagicBytes(txtBuffer, '.txt'),
      ).not.toThrow();
    });
  });
});
