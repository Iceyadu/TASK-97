import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Reservation } from '../reservations/reservation.entity';
import { Enrollment } from '../enrollments/enrollment.entity';

@Entity('offerings')
@Index('idx_offerings_enrollment_window', ['enrollmentWindowStart', 'enrollmentWindowEnd'])
export class Offering {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  assetId: string | null;

  @Column({ type: 'int' })
  seatCapacity: number;

  @Column({ type: 'int' })
  seatsAvailable: number;

  @Column({ type: 'timestamptz' })
  enrollmentWindowStart: Date;

  @Column({ type: 'timestamptz' })
  enrollmentWindowEnd: Date;

  @Column({ type: 'jsonb', default: {} })
  eligibilityFlags: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ type: 'boolean', default: true })
  waitlistEnabled: boolean;

  @Column({ type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Reservation, (r) => r.offering)
  reservations: Reservation[];

  @OneToMany(() => Enrollment, (e) => e.offering)
  enrollments: Enrollment[];

  isWindowOpen(): boolean {
    const now = new Date();
    return now >= this.enrollmentWindowStart && now <= this.enrollmentWindowEnd;
  }
}
