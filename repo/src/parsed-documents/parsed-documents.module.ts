import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParsedDocument } from './parsed-document.entity';
import { ContentFeature } from '../content/content-feature.entity';
import { ParsingService } from './parsing.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParsedDocument, ContentFeature])],
  providers: [ParsingService],
  exports: [ParsingService, TypeOrmModule],
})
export class ParsedDocumentsModule {}
