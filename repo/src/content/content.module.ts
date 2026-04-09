import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentAsset } from './content-asset.entity';
import { ContentAssetVersion } from './content-asset-version.entity';
import { ContentFeature } from './content-feature.entity';
import { ContentLineage } from './content-lineage.entity';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { FilesModule } from '../files/files.module';
import { ParsedDocumentsModule } from '../parsed-documents/parsed-documents.module';
import { DuplicateDetectionModule } from '../duplicate-detection/duplicate-detection.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentAsset,
      ContentAssetVersion,
      ContentFeature,
      ContentLineage,
    ]),
    FilesModule,
    ParsedDocumentsModule,
    DuplicateDetectionModule,
  ],
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
