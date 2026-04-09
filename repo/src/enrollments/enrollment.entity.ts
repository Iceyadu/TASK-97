import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Offering } from '../offerings/offering.entity';
import { User } from '../users/user.entity';

export enum EnrollmentStatus {
  WAITLISTED = 'WAITLISTED',
  APPROVED = 'APPROVED',
  CONFIRMED = 'CONFIRMED',
  CANCELED = 'CANCELED',
}

@Entity('enrollments')
@Index('idx_enrollments_offering_user', ['offeringId', 'userId'], {
  unique: true,
  where: "\"status\" != 'CANCELED'",
})
@Index('idx_enrollments_offering_status', ['offeringId', 'status'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  offeringId: string;

  @ManyToOne(() => Offering, (o) => o.enrollments)
  @JoinColumn({ name: 'offeringId' })
  offering: Offering;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  reservationId: string | null;

  @Column({ type: 'varchar', length: 20 })
  status: EnrollmentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  waitlistedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  canceledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
