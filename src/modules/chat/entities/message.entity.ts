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
import { Conversation } from './conversation.entity';
import { MessageStatus } from './message-status.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

export enum MessageStatusEnum {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('messages')
@Index(['conversationId'])
@Index(['senderId'])
@Index(['createdAt'])
@Index(['messageType'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  conversationId: string;

  @Column('uuid')
  senderId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    duration?: number; // for audio/video
  };

  @Column({
    type: 'enum',
    enum: MessageStatusEnum,
    default: MessageStatusEnum.SENT,
  })
  status: MessageStatusEnum;

  @Column({ type: 'timestamp', nullable: true })
  editedAt?: Date;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column('uuid', { nullable: true })
  replyToMessageId?: string;

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'replyToMessageId' })
  replyToMessage?: Message;

  @OneToMany(() => MessageStatus, (status) => status.message, {
    cascade: true,
  })
  messageStatuses: MessageStatus[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
