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

export enum LikeType {
  LIKE = 'like',
  DISLIKE = 'dislike',
  SUPER_LIKE = 'super_like',
}

@Entity('likes')
@Index(['likerId', 'likedId'], { unique: true })
@Index(['likerId'])
@Index(['likedId'])
@Index(['type'])
@Index(['createdAt'])
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  likerId: string;

  @Column('uuid')
  likedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'likerId' })
  liker: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'likedId' })
  liked: User;

  @Column({
    type: 'enum',
    enum: LikeType,
    default: LikeType.LIKE,
  })
  type: LikeType;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    swipeDirection?: 'left' | 'right' | 'up';
    deviceInfo?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };

  @CreateDateColumn()
  createdAt: Date;
}
