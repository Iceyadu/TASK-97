import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync, createReadStream } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileValidatorService } from './file-validator.service';
import { ReadStream } from 'fs';

@Injectable()
export class FilesService {
  constructor(
    private config: AppConfigService,
    private validator: FileValidatorService,
  ) {}

  async storeFile(
    file: Express.Multer.File,
    assetId: string,
    versionId: string,
    userId: string,
  ): Promise<{
    filePath: string;
    fileHash: string;
    fileSize: number;
    mimeType: string;
    safeName: string;
  }> {
    // Validate extension
    const ext = this.validator.validateExtension(file.originalname);

    // Validate size
    this.validator.validateSize(file.size);

    // Sanitize filename
    const safeName = this.validator.sanitizeFilename(file.originalname);

    // Validate magic bytes
    this.validator.validateMagicBytes(file.buffer, ext);

    // Compute SHA-256 hash
    const fileHash = createHash('sha256').update(file.buffer).digest('hex');

    // Store file
    const dir = join(this.config.fileStoragePath, assetId, versionId);
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, safeName);
    writeFileSync(filePath, file.buffer);

    // Structural validation (after storing, so we can read from disk)
    await this.validator.validateStructure(filePath, ext, userId);

    const relativePath = `${assetId}/${versionId}/${safeName}`;

    return {
      filePath: relativePath,
      fileHash,
      fileSize: file.size,
      mimeType: file.mimetype,
      safeName,
    };
  }

  getFileStream(relativePath: string): ReadStream {
    const fullPath = join(this.config.fileStoragePath, relativePath);
    if (!existsSync(fullPath)) {
      throw new Error('File not found');
    }
    return createReadStream(fullPath);
  }

  getFileBuffer(relativePath: string): Buffer {
    const fullPath = join(this.config.fileStoragePath, relativePath);
    return readFileSync(fullPath);
  }
}
