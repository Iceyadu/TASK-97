import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { AuditService } from '../audit/audit.service';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  '.epub': ['application/epub+zip'],
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.mp4': ['video/mp4'],
  '.mp3': ['audio/mpeg'],
};

const MAGIC_BYTES: Record<string, Buffer[]> = {
  '.epub': [Buffer.from([0x50, 0x4b, 0x03, 0x04])], // ZIP (EPUB is ZIP-based)
  '.pdf': [Buffer.from('%PDF', 'ascii')],
  '.mp4': [Buffer.from('ftyp', 'ascii')], // ftyp box identifier (at offset 4)
  '.mp3': [
    Buffer.from([0xff, 0xfb]), // MPEG sync
    Buffer.from([0xff, 0xf3]),
    Buffer.from([0xff, 0xf2]),
    Buffer.from('ID3', 'ascii'), // ID3 tag
  ],
};

// PDF dangerous keywords
const PDF_DANGEROUS_PATTERNS = [
  '/JavaScript',
  '/JS',
  '/Launch',
  '/EmbeddedFile',
  '/OpenAction',
  '/AA',
];

@Injectable()
export class FileValidatorService {
  constructor(
    private config: AppConfigService,
    private auditService: AuditService,
  ) {}

  sanitizeFilename(originalName: string): string {
    let name = originalName;
    // Strip path traversal
    name = name.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
    // Strip null bytes
    name = name.replace(/\0/g, '');
    // Strip control characters
    name = name.replace(/[\x00-\x1f\x7f]/g, '');
    // Replace spaces with underscores
    name = name.replace(/\s+/g, '_');
    // Keep only safe characters
    name = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Truncate
    if (name.length > 255) {
      const ext = this.getExtension(name);
      name = name.substring(0, 255 - ext.length) + ext;
    }
    if (!name) name = 'unnamed_file';
    // Prefix with UUID to prevent collisions
    const prefix = uuidv4().substring(0, 8);
    return `${prefix}_${name}`;
  }

  getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.substring(lastDot).toLowerCase() : '';
  }

  validateExtension(filename: string): string {
    const ext = this.getExtension(filename);
    if (!ALLOWED_EXTENSIONS[ext]) {
      throw new HttpException(
        `File type '${ext}' is not allowed. Allowed: ${Object.keys(ALLOWED_EXTENSIONS).join(', ')}`,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }
    return ext;
  }

  validateSize(size: number): void {
    if (size > this.config.maxFileSizeBytes) {
      throw new HttpException(
        `File size ${size} exceeds maximum of ${this.config.maxFileSizeBytes} bytes (250 MB)`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
  }

  validateMagicBytes(buffer: Buffer, extension: string): void {
    // MP4: ftyp box identifier appears at byte offset 4
    if (extension === '.mp4') {
      if (buffer.length < 8) {
        throw new HttpException(
          'File too small to be a valid MP4',
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        );
      }
      const ftyp = buffer.subarray(4, 8).toString('ascii');
      if (ftyp !== 'ftyp') {
        throw new HttpException(
          'File content does not match declared file type (missing ftyp box)',
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        );
      }
      return;
    }

    // TXT: validate content is valid UTF-8 text with no null bytes or excessive binary
    if (extension === '.txt') {
      this.validateTextContent(buffer);
      return;
    }

    const expectedMagic = MAGIC_BYTES[extension];
    if (!expectedMagic || expectedMagic.length === 0) return;

    const header = buffer.subarray(0, 8);
    const matches = expectedMagic.some((magic) =>
      header.subarray(0, magic.length).equals(magic),
    );

    if (!matches) {
      throw new HttpException(
        'File content does not match declared file type',
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }
  }

  private validateTextContent(buffer: Buffer): void {
    // Check for null bytes (strong indicator of binary content)
    if (buffer.includes(0x00)) {
      throw new HttpException(
        'File contains null bytes and is not valid text',
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    // Sample first 8KB for binary content detection
    const sampleSize = Math.min(buffer.length, 8192);
    const sample = buffer.subarray(0, sampleSize);
    let nonPrintable = 0;
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Allow TAB (0x09), LF (0x0A), CR (0x0D), and printable ASCII + valid UTF-8 lead bytes
      if (byte < 0x09 || (byte > 0x0d && byte < 0x20 && byte !== 0x1b)) {
        nonPrintable++;
      }
    }
    // If more than 10% of sampled bytes are non-printable control chars, reject
    if (sample.length > 0 && nonPrintable / sample.length > 0.1) {
      throw new HttpException(
        'File contains too many non-printable characters to be valid text',
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }
  }

  async validateStructure(
    filePath: string,
    extension: string,
    userId?: string,
  ): Promise<void> {
    try {
      if (extension === '.pdf') {
        await this.validatePdfStructure(filePath);
      } else if (extension === '.epub') {
        await this.validateEpubStructure(filePath);
      } else if (extension === '.mp4') {
        await this.validateMp4Structure(filePath);
      } else if (extension === '.txt') {
        await this.validateTxtStructure(filePath);
      }
    } catch (err: any) {
      await this.auditService.recordEvent({
        action: 'file.structural_validation_failed',
        resourceType: 'files',
        actorId: userId,
        reason: err.message,
      });
      throw new HttpException(
        `File failed structural validation: ${err.message}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async validatePdfStructure(filePath: string): Promise<void> {
    const content = readFileSync(filePath, 'ascii');
    for (const pattern of PDF_DANGEROUS_PATTERNS) {
      if (content.includes(pattern)) {
        throw new Error(
          `PDF contains potentially dangerous element: ${pattern}`,
        );
      }
    }
  }

  private async validateMp4Structure(filePath: string): Promise<void> {
    const buffer = readFileSync(filePath);
    if (buffer.length < 8) {
      throw new Error('MP4 file too small to be valid');
    }
    // Verify ftyp box: first 4 bytes are box size (big-endian), next 4 are 'ftyp'
    const boxSize = buffer.readUInt32BE(0);
    const boxType = buffer.subarray(4, 8).toString('ascii');
    if (boxType !== 'ftyp') {
      throw new Error('MP4 file missing ftyp box');
    }
    if (boxSize < 8 || boxSize > buffer.length) {
      throw new Error('MP4 ftyp box has invalid size');
    }
    // Check for known MP4 brands within the ftyp box
    const brand = buffer.subarray(8, 12).toString('ascii');
    const knownBrands = ['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6',
      'mp41', 'mp42', 'M4V ', 'M4A ', 'avc1', 'dash', 'msdh', 'msix'];
    if (!knownBrands.some((b) => brand.startsWith(b.trim()))) {
      throw new Error(`MP4 file has unrecognized brand: ${brand}`);
    }
  }

  private async validateTxtStructure(filePath: string): Promise<void> {
    const buffer = readFileSync(filePath);
    if (buffer.length === 0) {
      throw new Error('Text file is empty');
    }
    // Verify no null bytes in the entire file
    if (buffer.includes(0x00)) {
      throw new Error('Text file contains null bytes — likely binary content');
    }
  }

  private async validateEpubStructure(filePath: string): Promise<void> {
    // EPUB is a ZIP file. Check for suspicious entries.
    // We read the first bytes to verify ZIP structure
    const buffer = readFileSync(filePath);
    if (buffer.length < 4) {
      throw new Error('EPUB file too small to be valid');
    }
    // Check ZIP magic
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new Error('EPUB file is not a valid ZIP archive');
    }
    // Check for executable extensions in ZIP entries by scanning for common patterns
    const content = buffer.toString('ascii');
    const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js'];
    for (const ext of dangerousExts) {
      // Look for filenames ending in dangerous extensions within the ZIP directory
      const pattern = ext + '\x00'; // null-terminated in ZIP
      if (content.includes(pattern)) {
        throw new Error(`EPUB contains potentially dangerous file type: ${ext}`);
      }
    }
  }
}
