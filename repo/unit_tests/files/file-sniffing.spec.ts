/**
 * File Sniffing Tests
 * Tests actual magic byte validation for MP4, TXT, and other file types.
 * Exercises real FileValidatorService methods with crafted buffers.
 */
import { FileValidatorService } from '../../src/files/file-validator.service';

describe('FileValidatorService – content sniffing', () => {
  let service: FileValidatorService;
  let mockConfig: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockConfig = { maxFileSizeBytes: 250 * 1024 * 1024 };
    mockAuditService = { recordEvent: jest.fn().mockResolvedValue(undefined) };
    service = new FileValidatorService(mockConfig, mockAuditService);
  });

  describe('MP4 magic byte validation', () => {
    it('should accept a valid MP4 buffer with ftyp box', () => {
      // Valid MP4: first 4 bytes = box size, next 4 = 'ftyp'
      const buf = Buffer.alloc(32);
      buf.writeUInt32BE(32, 0); // box size
      buf.write('ftyp', 4, 'ascii'); // box type
      buf.write('isom', 8, 'ascii'); // major brand

      expect(() => service.validateMagicBytes(buf, '.mp4')).not.toThrow();
    });

    it('should reject a buffer without ftyp box at offset 4', () => {
      const buf = Buffer.from('This is definitely not an MP4 file content');
      expect(() => service.validateMagicBytes(buf, '.mp4')).toThrow(
        'missing ftyp box',
      );
    });

    it('should reject a buffer that is too small for MP4', () => {
      const buf = Buffer.from([0x00, 0x00]);
      expect(() => service.validateMagicBytes(buf, '.mp4')).toThrow(
        'too small',
      );
    });

    it('should reject a PDF file masquerading as MP4', () => {
      const buf = Buffer.from('%PDF-1.4 some pdf content here...');
      expect(() => service.validateMagicBytes(buf, '.mp4')).toThrow();
    });
  });

  describe('TXT content validation', () => {
    it('should accept valid UTF-8 text', () => {
      const buf = Buffer.from('Hello, this is a valid text file.\nWith multiple lines.\n');
      expect(() => service.validateMagicBytes(buf, '.txt')).not.toThrow();
    });

    it('should reject binary content with null bytes', () => {
      const buf = Buffer.from([0x48, 0x65, 0x6c, 0x00, 0x6f]);
      expect(() => service.validateMagicBytes(buf, '.txt')).toThrow(
        'null bytes',
      );
    });

    it('should reject binary content with excessive non-printable characters', () => {
      // Create a buffer that is 50% control characters
      const buf = Buffer.alloc(100);
      for (let i = 0; i < 100; i++) {
        buf[i] = i % 2 === 0 ? 0x01 : 0x41; // alternating SOH and 'A'
      }
      expect(() => service.validateMagicBytes(buf, '.txt')).toThrow(
        'non-printable',
      );
    });

    it('should accept text with normal whitespace characters', () => {
      const buf = Buffer.from('Line 1\tTabbed\r\nLine 2\nLine 3');
      expect(() => service.validateMagicBytes(buf, '.txt')).not.toThrow();
    });
  });

  describe('PDF magic byte validation', () => {
    it('should accept a valid PDF buffer', () => {
      const buf = Buffer.from('%PDF-1.7 rest of pdf content');
      expect(() => service.validateMagicBytes(buf, '.pdf')).not.toThrow();
    });

    it('should reject a non-PDF buffer', () => {
      const buf = Buffer.from('Not a PDF at all');
      expect(() => service.validateMagicBytes(buf, '.pdf')).toThrow();
    });
  });

  describe('EPUB magic byte validation', () => {
    it('should accept a valid EPUB (ZIP) buffer', () => {
      const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
      expect(() => service.validateMagicBytes(buf, '.epub')).not.toThrow();
    });

    it('should reject a non-ZIP buffer for EPUB', () => {
      const buf = Buffer.from('Not a zip file');
      expect(() => service.validateMagicBytes(buf, '.epub')).toThrow();
    });
  });

  describe('MP3 magic byte validation', () => {
    it('should accept MP3 with MPEG sync word', () => {
      const buf = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(() => service.validateMagicBytes(buf, '.mp3')).not.toThrow();
    });

    it('should accept MP3 with ID3 tag', () => {
      const buf = Buffer.from('ID3\x04\x00\x00\x00\x00');
      expect(() => service.validateMagicBytes(buf, '.mp3')).not.toThrow();
    });

    it('should reject non-MP3 content', () => {
      const buf = Buffer.from('This is not audio');
      expect(() => service.validateMagicBytes(buf, '.mp3')).toThrow();
    });
  });

  describe('Extension validation', () => {
    it('should accept all allowed extensions', () => {
      for (const ext of ['.pdf', '.epub', '.txt', '.mp4', '.mp3']) {
        expect(service.validateExtension(`file${ext}`)).toBe(ext);
      }
    });

    it('should reject disallowed extensions', () => {
      for (const ext of ['.exe', '.bat', '.js', '.html', '.php']) {
        expect(() => service.validateExtension(`file${ext}`)).toThrow();
      }
    });
  });

  describe('Cross-type rejection', () => {
    it('should reject a PDF file uploaded as .txt', () => {
      const buf = Buffer.from('%PDF-1.4\x00some binary pdf content');
      // The null byte check should catch this
      expect(() => service.validateMagicBytes(buf, '.txt')).toThrow();
    });

    it('should reject an EXE masquerading as .mp3', () => {
      const buf = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ header
      expect(() => service.validateMagicBytes(buf, '.mp3')).toThrow();
    });
  });
});
