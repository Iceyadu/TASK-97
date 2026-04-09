import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('duplicate_links')
@Index('idx_dl_doc_a', ['docAId'])
@Index('idx_dl_doc_b', ['docBId'])
export class DuplicateLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  groupId: string | null;

  @Column({ type: 'uuid' })
  docAId: string;

  @Column({ type: 'uuid' })
  docBId: string;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  similarityScore: number;

  @CreateDateColumn({ type: 'timestamptz' })
  detectedAt: Date;
}
