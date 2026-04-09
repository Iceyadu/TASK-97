import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserRole } from '../roles/user-role.entity';
import { Session } from '../auth/session.entity';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_users_username', { unique: true })
  username: string;

  @Column({ type: 'text' })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'varchar', length: 255 })
  displayName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({ type: 'text', nullable: true })
  @Exclude()
  governmentId: string | null;

  @Column({ type: 'text', nullable: true })
  @Exclude()
  employeeId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => UserRole, (ur) => ur.user, { eager: false })
  userRoles: UserRole[];

  @OneToMany(() => Session, (s) => s.user, { eager: false })
  sessions: Session[];

  isLocked(): boolean {
    return this.lockedUntil !== null && this.lockedUntil > new Date();
  }
}
