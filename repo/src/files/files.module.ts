import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecureDownloadToken } from './download-token.entity';
import { ContentAssetVersion } from '../content/content-asset-version.entity';
import { FilesService } from './files.service';
import { DownloadTokenService } from './download-token.service';
import { FilesController } from './files.controller';
import { FileValidatorService } from './file-validator.service';

@Module({
  imports: [TypeOrmModule.forFeature([SecureDownloadToken, ContentAssetVersion])],
  providers: [FilesService, DownloadTokenService, FileValidatorService],
  controllers: [FilesController],
  exports: [FilesService, DownloadTokenService, FileValidatorService],
})
export class FilesModule {}
