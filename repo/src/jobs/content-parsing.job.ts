import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentAssetVersion } from '../content/content-asset-version.entity';
import { ParsingService } from '../parsed-documents/parsing.service';
import { DuplicateDetectionService } from '../duplicate-detection/duplicate-detection.service';
import { FilesService } from '../files/files.service';
import { AuditService } from '../audit/audit.service';

const MAX_RETRIES = 3;

@Injectable()
export class ContentParsingJob {
  private readonly logger = new Logger(ContentParsingJob.name);

  constructor(
    @InjectRepository(ContentAssetVersion)
    private versionRepo: Repository<ContentAssetVersion>,
    private parsingService: ParsingService,
    private duplicateDetection: DuplicateDetectionService,
    private filesService: FilesService,
    private auditService: AuditService,
  ) {}

  @Cron('*/5 * * * *') // Every 5 minutes
  async parseUnprocessedContent(): Promise<void> {
    const pending = await this.versionRepo.find({
      where: { parseStatus: 'PENDING' },
    });

    for (const version of pending) {
      // Atomically claim the version by setting status to PROCESSING
      const claimed = await this.versionRepo
        .createQueryBuilder()
        .update()
        .set({ parseStatus: 'PROCESSING' })
        .where('id = :id AND "parseStatus" = :status', {
          id: version.id,
          status: 'PENDING',
        })
        .execute();

      if (!claimed.affected || claimed.affected === 0) {
        continue; // Another job instance already claimed this version
      }

      try {
        this.logger.log(`Parsing version ${version.id}`);

        const buffer = this.filesService.getFileBuffer(version.filePath);
        const docs = await this.parsingService.parseAndStore(
          version.id,
          buffer,
          version.mimeType,
        );

        // Extract and store features (token count, language, shingle hashes)
        try {
          await this.parsingService.extractAndStoreFeatures(version.id, docs);
        } catch (featureErr) {
          this.logger.warn(
            `Feature extraction failed for version ${version.id}: ${featureErr}`,
          );
        }

        version.parseStatus = 'COMPLETED';
        await this.versionRepo.save(version);

        // Trigger duplicate detection for each parsed document
        for (const doc of docs) {
          try {
            await this.duplicateDetection.detectExactDuplicates(doc.id);
            await this.duplicateDetection.detectNearDuplicates(doc.id);
          } catch (err) {
            this.logger.warn(
              `Duplicate detection failed for doc ${doc.id}: ${err}`,
            );
          }
        }

        this.logger.log(
          `Parsed version ${version.id}: ${docs.length} documents`,
        );
      } catch (err) {
        version.parseRetries++;
        if (version.parseRetries >= MAX_RETRIES) {
          version.parseStatus = 'PARSE_ERROR';
          await this.auditService.recordEvent({
            action: 'content.parse_error',
            resourceType: 'content_asset_versions',
            resourceId: version.id,
            reason: `Parse failed after ${MAX_RETRIES} retries: ${err}`,
          });
        } else {
          version.parseStatus = 'PENDING'; // Reset to PENDING for retry
        }
        await this.versionRepo.save(version);
        this.logger.error(
          `Parse failed for version ${version.id} (retry ${version.parseRetries}): ${err}`,
        );
      }
    }
  }
}
