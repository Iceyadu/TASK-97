import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('content_features')
@Index('idx_cf_version_id', ['versionId'])
export class ContentFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  versionId: string;

  @Column({ type: 'uuid' })
  documentId: string;

  @Column({ type: 'int' })
  tokenCount: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  language: string | null;

  @Column({ type: 'jsonb' })
  shingleHashes: number[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
