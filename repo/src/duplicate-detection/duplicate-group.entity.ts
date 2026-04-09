import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('duplicate_groups')
export class DuplicateGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  canonicalDocumentId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
