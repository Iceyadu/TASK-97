import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('idempotency_keys')
@Index('idx_ik_created_at', ['createdAt'])
export class IdempotencyKey {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  key: string;

  @PrimaryColumn({ type: 'varchar', length: 255 })
  endpoint: string;

  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @Column({ type: 'int' })
  responseStatus: number;

  @Column({ type: 'jsonb' })
  responseBody: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
