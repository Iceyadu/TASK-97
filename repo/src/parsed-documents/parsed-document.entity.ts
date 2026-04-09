import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { ContentAssetVersion } from '../content/content-asset-version.entity';

@Entity('parsed_documents')
@Index('idx_pd_version_id', ['versionId'])
@Index('idx_pd_content_hash', ['contentHash'])
export class ParsedDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  versionId: string;

  @ManyToOne(() => ContentAssetVersion, (v) => v.parsedDocuments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'versionId' })
  version: ContentAssetVersion;

  @Column({ type: 'int' })
  chapterIndex: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string | null;

  @Column({ type: 'text' })
  contentText: string;

  @Column({ type: 'varchar', length: 64 })
  contentHash: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
