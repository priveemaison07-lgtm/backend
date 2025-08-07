import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
}

@Entity('conversations')
@Index(['participant1Id', 'participant2Id'], { unique: true })
@Index(['status'])
@Index(['lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  participant1Id: string;

  @Column('uuid')
  participant2Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant1Id' })
  participant1: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant2Id' })
  participant2: User;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column('uuid', { nullable: true })
  lastMessageId?: string;

  @Column({ default: 0 })
  participant1UnreadCount: number;

  @Column({ default: 0 })
  participant2UnreadCount: number;

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
  })
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to get the other participant
  getOtherParticipant(currentUserId: string): string {
    return this.participant1Id === currentUserId ? this.participant2Id : this.participant1Id;
  }

  // Helper method to get unread count for a user
  getUnreadCount(userId: string): number {
    return this.participant1Id === userId 
      ? this.participant1UnreadCount 
      : this.participant2UnreadCount;
  }
}
