import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('enrollment_state_transitions')
@Index('idx_est_enrollment_id', ['enrollmentId'])
@Index('idx_est_reservation_id', ['reservationId'])
export class EnrollmentStateTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  enrollmentId: string | null;

  @Column({ type: 'uuid', nullable: true })
  reservationId: string | null;

  @Column({ type: 'varchar', length: 20 })
  fromState: string;

  @Column({ type: 'varchar', length: 20 })
  toState: string;

  @Column({ type: 'uuid' })
  actorId: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'uuid' })
  traceId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;
}
