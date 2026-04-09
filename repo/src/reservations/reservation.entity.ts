import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Offering } from '../offerings/offering.entity';
import { User } from '../users/user.entity';

export enum ReservationStatus {
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  CONVERTED = 'CONVERTED',
}

@Entity('reservations')
@Index('idx_reservations_expires_at', ['expiresAt'])
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  offeringId: string;

  @ManyToOne(() => Offering, (o) => o.reservations)
  @JoinColumn({ name: 'offeringId' })
  offering: Offering;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  status: ReservationStatus;

  @Column({ type: 'timestamptz' })
  heldAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
