import {
  Controller,
  Get,
  Query,
  Res,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { DownloadTokenService } from './download-token.service';
import { FilesService } from './files.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentAssetVersion } from '../content/content-asset-version.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('files')
export class FilesController {
  constructor(
    private readonly downloadTokenService: DownloadTokenService,
    private readonly filesService: FilesService,
    @InjectRepository(ContentAssetVersion)
    private readonly versionRepo: Repository<ContentAssetVersion>,
  ) {}

  @Get('download')
  async download(
    @Query('token') token: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    if (!token) {
      throw new BadRequestException('Download token is required');
    }
    const payload = this.downloadTokenService.validateToken(token);
    if (payload.userId !== userId) {
      throw new ForbiddenException('Download token does not belong to this user');
    }

    const version = await this.versionRepo.findOne({
      where: { id: payload.versionId, assetId: payload.assetId },
    });
    if (!version) {
      throw new NotFoundException('File version not found');
    }

    const stream = this.filesService.getFileStream(version.filePath);
    res.setHeader('Content-Type', version.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${version.filePath.split('/').pop()}"`);
    stream.pipe(res);
  }
}
