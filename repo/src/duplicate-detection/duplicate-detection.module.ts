import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DuplicateGroup } from './duplicate-group.entity';
import { DuplicateLink } from './duplicate-link.entity';
import { CanonicalLink } from './canonical-link.entity';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { ParsedDocumentsModule } from '../parsed-documents/parsed-documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DuplicateGroup, DuplicateLink, CanonicalLink]),
    ParsedDocumentsModule,
  ],
  providers: [DuplicateDetectionService],
  exports: [DuplicateDetectionService],
})
export class DuplicateDetectionModule {}
