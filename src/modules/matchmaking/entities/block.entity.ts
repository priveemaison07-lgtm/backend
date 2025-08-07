import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum BlockReason {
  INAPPROPRIATE_BEHAVIOR = 'inappropriate_behavior',
  SPAM = 'spam',
  FAKE_PROFILE = 'fake_profile',
  HARASSMENT = 'harassment',
  OTHER = 'other',
}

@Entity('blocks')
@Index(['blockerId', 'blockedId'], { unique: true })
@Index(['blockerId'])
@Index(['blockedId'])
@Index(['createdAt'])
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  blockerId: string;

  @Column('uuid')
  blockedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockerId' })
  blocker: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockedId' })
  blocked: User;

  @Column({
    type: 'enum',
    enum: BlockReason,
    nullable: true,
  })
  reason?: BlockReason;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;
}
