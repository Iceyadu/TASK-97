import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ContentAsset } from './content-asset.entity';
import { ParsedDocument } from '../parsed-documents/parsed-document.entity';

@Entity('content_asset_versions')
@Index('idx_cav_file_hash', ['fileHash'])
@Index('idx_cav_parent_version_id', ['parentVersionId'])
@Index('idx_cav_source_asset_id', ['sourceAssetId'])
export class ContentAssetVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  assetId: string;

  @ManyToOne(() => ContentAsset, (a) => a.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset: ContentAsset;

  @Column({ type: 'varchar', length: 20 })
  semanticVersion: string;

  @Column({ type: 'uuid', nullable: true })
  parentVersionId: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceAssetId: string | null;

  @Column({ type: 'text' })
  filePath: string;

  @Column({ type: 'varchar', length: 64 })
  fileHash: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'boolean', default: true })
  isCurrent: boolean;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  parseStatus: string; // PENDING, COMPLETED, FAILED, PARSE_ERROR

  @Column({ type: 'int', default: 0 })
  parseRetries: number;

  @Column({ type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ParsedDocument, (pd) => pd.version)
  parsedDocuments: ParsedDocument[];
}
