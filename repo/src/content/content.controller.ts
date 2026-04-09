import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContentService } from './content.service';
import { DuplicateDetectionService } from '../duplicate-detection/duplicate-detection.service';
import { ParsingService } from '../parsed-documents/parsing.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AssetType } from './content-asset.entity';
import { memoryStorage } from 'multer';
import {
  IsArray,
  IsBooleanString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

class CreateContentAssetDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(AssetType)
  assetType: AssetType;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  categoryIds?: string;

  @IsOptional()
  @IsString()
  tagIds?: string;
}

class UpdateContentAssetDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  effectiveTo?: string;

  @IsOptional()
  @IsBooleanString()
  bumpMajor?: string;
}

class RollbackDto {
  @IsUUID('4')
  @IsNotEmpty()
  targetVersionId: string;
}

class MergeDto {
  @IsArray()
  @IsUUID('4', { each: true })
  sourceAssetIds: string[];
}

@Controller('content-assets')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly duplicateService: DuplicateDetectionService,
    private readonly parsingService: ParsingService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('content_manager', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 250 * 1024 * 1024 },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateContentAssetDto,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.contentService.createAsset(file, {
      title: dto.title,
      assetType: dto.assetType,
      author: dto.author,
      publisher: dto.publisher,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      categoryIds: dto.categoryIds ? JSON.parse(dto.categoryIds) : undefined,
      tagIds: dto.tagIds ? JSON.parse(dto.tagIds) : undefined,
    }, userId);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('assetType') assetType?: string,
    @Query('categoryId') categoryId?: string,
    @Query('tagId') tagId?: string,
    @Query('author') author?: string,
  ) {
    return this.contentService.findAll({
      page, pageSize, search, assetType, categoryId, tagId, author,
    });
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.contentService.findById(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('content_manager', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 250 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateContentAssetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.contentService.updateAsset(id, file, {
      title: dto.title,
      author: dto.author,
      publisher: dto.publisher,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      bumpMajor: dto.bumpMajor === 'true',
    }, userId);
  }

  @Get(':id/versions')
  async getVersions(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.contentService.getVersions(id);
  }

  @Get(':id/versions/:versionId')
  async getVersion(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ) {
    return this.contentService.getVersion(id, versionId);
  }

  @Post(':id/rollback')
  @UseGuards(RolesGuard)
  @Roles('content_manager', 'admin')
  async rollback(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RollbackDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.contentService.rollback(id, dto.targetVersionId, userId);
  }

  @Get(':id/versions/:versionId/download-token')
  async getDownloadToken(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contentService.getDownloadToken(id, versionId, userId);
  }

  @Get(':id/lineage')
  async getLineage(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.contentService.getLineage(id);
  }

  @Post(':id/merge')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async merge(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: MergeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.duplicateService.mergeCanonical(dto.sourceAssetIds, id, userId);
  }

  @Get(':id/parsed')
  async getParsedDocuments(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const asset = await this.contentService.findById(id);
    const currentVersion = asset.versions?.find((v) => v.isCurrent);
    if (!currentVersion) {
      throw new BadRequestException('No current version found for this asset');
    }
    return this.parsingService.findByVersionId(currentVersion.id);
  }

  @Get(':id/duplicates')
  @UseGuards(RolesGuard)
  @Roles('content_manager', 'admin')
  async getDuplicates(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.contentService.getDuplicateLinks(id);
  }
}
