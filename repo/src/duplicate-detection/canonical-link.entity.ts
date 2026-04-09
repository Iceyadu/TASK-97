import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('canonical_links')
@Index('idx_canonical_source', ['sourceAssetId'], { unique: true })
@Index('idx_canonical_target', ['canonicalAssetId'])
export class CanonicalLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sourceAssetId: string;

  @Column({ type: 'uuid' })
  canonicalAssetId: string;

  @Column({ type: 'uuid' })
  mergedBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
