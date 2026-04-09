import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

export enum LineageRelationship {
  DERIVED = 'derived',
  MERGED = 'merged',
  ROLLBACK = 'rollback',
  EXTRACTED = 'extracted',
}

@Entity('content_lineage')
@Index('idx_cl_descendant', ['descendantVersionId'])
@Index('idx_cl_ancestor', ['ancestorVersionId'])
export class ContentLineage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  descendantVersionId: string;

  @Column({ type: 'uuid' })
  ancestorVersionId: string;

  @Column({ type: 'varchar', length: 20 })
  relationshipType: LineageRelationship;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
