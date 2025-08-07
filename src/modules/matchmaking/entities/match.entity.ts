import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MatchStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  BLOCKED = 'blocked',
}

@Entity('matches')
@Index(['user1Id', 'user2Id'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user1Id: string;

  @Column('uuid')
  user2Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user1Id' })
  user1: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user2Id' })
  user2: User;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.ACTIVE,
  })
  status: MatchStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  compatibilityScore?: number;

  @Column({ type: 'timestamp', nullable: true })
  lastInteraction?: Date;

  @Column({ default: false })
  isConversationStarted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
