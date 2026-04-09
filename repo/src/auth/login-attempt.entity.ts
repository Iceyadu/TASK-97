import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('login_attempts')
@Index('idx_login_attempts_user_id_attempted_at', ['userId', 'attemptedAt'])
@Index('idx_login_attempts_ip_attempted_at', ['ipAddress', 'attemptedAt'])
export class LoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 45 })
  ipAddress: string;

  @CreateDateColumn({ type: 'timestamptz' })
  attemptedAt: Date;

  @Column({ type: 'boolean' })
  success: boolean;
}
