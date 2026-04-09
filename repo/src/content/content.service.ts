import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ContentAsset, AssetType } from './content-asset.entity';
import { ContentAssetVersion } from './content-asset-version.entity';
import { ContentLineage, LineageRelationship } from './content-lineage.entity';
import { FilesService } from '../files/files.service';
import { DownloadTokenService } from '../files/download-token.service';
import { AppConfigService } from '../config/config.service';
import { AuditService } from '../audit/audit.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentAsset)
    private assetRepo: Repository<ContentAsset>,
    @InjectRepository(ContentAssetVersion)
    private versionRepo: Repository<ContentAssetVersion>,
    @InjectRepository(ContentLineage)
    private lineageRepo: Repository<ContentLineage>,
    private filesService: FilesService,
    private downloadTokenService: DownloadTokenService,
    private config: AppConfigService,
    private auditService: AuditService,
    private dataSource: DataSource,
  ) {}

  async createAsset(
    file: Express.Multer.File,
    data: {
      title: string;
      assetType: AssetType;
      author?: string;
      publisher?: string;
      effectiveFrom?: Date;
      effectiveTo?: Date;
      categoryIds?: string[];
      tagIds?: string[];
    },
    userId: string,
  ) {
    const assetId = uuidv4();
    const versionId = uuidv4();

    const stored = await this.filesService.storeFile(
      file,
      assetId,
      versionId,
      userId,
    );

    return this.dataSource.transaction(async (manager) => {
      const asset = manager.create(ContentAsset, {
        id: assetId,
        title: data.title,
        assetType: data.assetType,
        author: data.author || null,
        publisher: data.publisher || null,
        effectiveFrom: data.effectiveFrom || null,
        effectiveTo: data.effectiveTo || null,
        createdBy: userId,
      });
      await manager.save(asset);

      const version = manager.create(ContentAssetVersion, {
        id: versionId,
        assetId: asset.id,
        semanticVersion: '1.0.0',
        filePath: stored.filePath,
        fileHash: stored.fileHash,
        fileSize: stored.fileSize,
        mimeType: stored.mimeType,
        isCurrent: true,
        parseStatus: 'PENDING',
        createdBy: userId,
      });
      await manager.save(version);

      // Category/Tag associations handled via separate endpoints or here if IDs provided
      if (data.categoryIds?.length) {
        await manager
          .createQueryBuilder()
          .insert()
          .into('asset_categories')
          .values(
            data.categoryIds.map((cid) => ({
              assetId: asset.id,
              categoryId: cid,
            })),
          )
          .execute();
      }

      if (data.tagIds?.length) {
        await manager
          .createQueryBuilder()
          .insert()
          .into('asset_tags')
          .values(
            data.tagIds.map((tid) => ({
              assetId: asset.id,
              tagId: tid,
            })),
          )
          .execute();
      }

      await this.auditService.recordEvent({
        action: 'content.create',
        resourceType: 'content_assets',
        resourceId: asset.id,
        actorId: userId,
      });

      return {
        ...asset,
        currentVersion: version,
      };
    });
  }

  async updateAsset(
    assetId: string,
    file: Express.Multer.File | undefined,
    data: {
      title?: string;
      author?: string;
      publisher?: string;
      effectiveFrom?: Date;
      effectiveTo?: Date;
      bumpMajor?: boolean;
    },
    userId: string,
  ) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Content asset not found');

    const currentVersion = await this.versionRepo.findOne({
      where: { assetId, isCurrent: true },
    });
    if (!currentVersion) throw new NotFoundException('No current version');

    return this.dataSource.transaction(async (manager) => {
      // Update metadata
      if (data.title) asset.title = data.title;
      if (data.author !== undefined) asset.author = data.author || null;
      if (data.publisher !== undefined) asset.publisher = data.publisher || null;
      if (data.effectiveFrom !== undefined) asset.effectiveFrom = data.effectiveFrom || null;
      if (data.effectiveTo !== undefined) asset.effectiveTo = data.effectiveTo || null;
      await manager.save(asset);

      // Determine version bump
      const newVersion = this.bumpVersion(
        currentVersion.semanticVersion,
        file ? 'minor' : 'patch',
        data.bumpMajor || false,
      );

      let stored = {
        filePath: currentVersion.filePath,
        fileHash: currentVersion.fileHash,
        fileSize: currentVersion.fileSize,
        mimeType: currentVersion.mimeType,
      };

      const versionId = uuidv4();

      if (file) {
        stored = await this.filesService.storeFile(
          file,
          assetId,
          versionId,
          userId,
        );
      }

      // Mark old version as not current
      currentVersion.isCurrent = false;
      await manager.save(currentVersion);

      // Create new version
      const version = manager.create(ContentAssetVersion, {
        id: versionId,
        assetId,
        semanticVersion: newVersion,
        parentVersionId: currentVersion.id,
        filePath: stored.filePath,
        fileHash: stored.fileHash,
        fileSize: stored.fileSize,
        mimeType: stored.mimeType,
        isCurrent: true,
        parseStatus: file ? 'PENDING' : currentVersion.parseStatus,
        createdBy: userId,
      });
      await manager.save(version);

      // Record lineage
      const lineage = manager.create(ContentLineage, {
        descendantVersionId: version.id,
        ancestorVersionId: currentVersion.id,
        relationshipType: LineageRelationship.DERIVED,
      });
      await manager.save(lineage);

      await this.auditService.recordEvent({
        action: 'content.update',
        resourceType: 'content_assets',
        resourceId: assetId,
        actorId: userId,
        changes: { newVersion },
      });

      return { ...asset, currentVersion: version };
    });
  }

  async rollback(
    assetId: string,
    targetVersionId: string,
    userId: string,
  ) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Content asset not found');

    const targetVersion = await this.versionRepo.findOne({
      where: { id: targetVersionId, assetId },
    });
    if (!targetVersion) {
      throw new BadRequestException('Target version not found for this asset');
    }

    // Check 180-day window
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.rollbackWindowDays);
    if (targetVersion.createdAt < cutoff) {
      throw new BadRequestException(
        `Cannot rollback to version older than ${this.config.rollbackWindowDays} days`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const currentVersion = await manager.findOne(ContentAssetVersion, {
        where: { assetId, isCurrent: true },
      });

      if (currentVersion) {
        currentVersion.isCurrent = false;
        await manager.save(currentVersion);
      }

      const newVersion = manager.create(ContentAssetVersion, {
        id: uuidv4(),
        assetId,
        semanticVersion: this.bumpVersion(
          currentVersion?.semanticVersion || '1.0.0',
          'minor',
          false,
        ),
        parentVersionId: currentVersion?.id || null,
        sourceAssetId: targetVersion.sourceAssetId,
        filePath: targetVersion.filePath,
        fileHash: targetVersion.fileHash,
        fileSize: targetVersion.fileSize,
        mimeType: targetVersion.mimeType,
        isCurrent: true,
        parseStatus: targetVersion.parseStatus,
        createdBy: userId,
      });
      await manager.save(newVersion);

      // Record rollback lineage
      const lineage = manager.create(ContentLineage, {
        descendantVersionId: newVersion.id,
        ancestorVersionId: targetVersion.id,
        relationshipType: LineageRelationship.ROLLBACK,
      });
      await manager.save(lineage);

      await this.auditService.recordEvent({
        action: 'content.rollback',
        resourceType: 'content_assets',
        resourceId: assetId,
        actorId: userId,
        changes: {
          targetVersionId,
          newVersionId: newVersion.id,
        },
      });

      return { ...asset, currentVersion: newVersion };
    });
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    assetType?: string;
    categoryId?: string;
    tagId?: string;
    author?: string;
  }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);

    const qb = this.assetRepo
      .createQueryBuilder('ca')
      .leftJoinAndSelect('ca.versions', 'v', 'v.isCurrent = true')
      .leftJoinAndSelect('ca.categories', 'cat')
      .leftJoinAndSelect('ca.tags', 'tag');

    if (query.search) {
      qb.andWhere('(ca.title ILIKE :s OR ca.author ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    if (query.assetType) {
      qb.andWhere('ca.assetType = :at', { at: query.assetType });
    }
    if (query.author) {
      qb.andWhere('ca.author ILIKE :author', { author: `%${query.author}%` });
    }

    qb.orderBy('ca.updatedAt', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findById(id: string) {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['versions', 'categories', 'tags'],
    });
    if (!asset) throw new NotFoundException('Content asset not found');
    return asset;
  }

  async getVersions(assetId: string) {
    return this.versionRepo.find({
      where: { assetId },
      order: { createdAt: 'DESC' },
    });
  }

  async getVersion(assetId: string, versionId: string) {
    const version = await this.versionRepo.findOne({
      where: { id: versionId, assetId },
      relations: ['parsedDocuments'],
    });
    if (!version) throw new NotFoundException('Version not found');
    return version;
  }

  async getDownloadToken(assetId: string, versionId: string, userId: string) {
    const version = await this.versionRepo.findOne({
      where: { id: versionId, assetId },
    });
    if (!version) throw new NotFoundException('Version not found');
    return this.downloadTokenService.generateToken(assetId, versionId, userId);
  }

  async getLineage(assetId: string) {
    const versions = await this.versionRepo.find({
      where: { assetId },
      select: ['id'],
    });
    if (!versions.length) return [];

    const versionIds = versions.map((v) => v.id);
    return this.lineageRepo
      .createQueryBuilder('cl')
      .where(
        'cl.descendantVersionId IN (:...vids) OR cl.ancestorVersionId IN (:...vids)',
        { vids: versionIds },
      )
      .orderBy('cl.createdAt', 'DESC')
      .getMany();
  }

  async getDuplicateLinks(assetId: string) {
    const currentVersion = await this.versionRepo.findOne({
      where: { assetId, isCurrent: true },
    });
    if (!currentVersion) {
      throw new NotFoundException('No current version found for this asset');
    }

    // Find all parsed documents for the current version
    const parsedDocs = await this.dataSource
      .createQueryBuilder()
      .select('pd.id')
      .from('parsed_documents', 'pd')
      .where('pd.versionId = :versionId', { versionId: currentVersion.id })
      .getRawMany();

    if (!parsedDocs.length) {
      return [];
    }

    const docIds = parsedDocs.map((d) => d.pd_id || d.id);

    // Query duplicate_links where any of the parsed doc IDs appear as docA or docB
    return this.dataSource
      .createQueryBuilder()
      .select('dl')
      .from('duplicate_links', 'dl')
      .where('dl.docAId IN (:...docIds) OR dl.docBId IN (:...docIds)', { docIds })
      .getRawMany();
  }

  private bumpVersion(
    current: string,
    level: 'patch' | 'minor' | 'major',
    forceMajor: boolean,
  ): string {
    const [major, minor, patch] = current.split('.').map(Number);
    if (forceMajor) return `${major + 1}.0.0`;
    if (level === 'major') return `${major + 1}.0.0`;
    if (level === 'minor') return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
  }
}
