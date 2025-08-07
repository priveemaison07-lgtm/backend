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
import { Message } from './message.entity';

export enum MessageReadStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Entity('message_statuses')
@Index(['messageId', 'userId'], { unique: true })
@Index(['messageId'])
@Index(['userId'])
@Index(['status'])
export class MessageStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  messageId: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Message, (message) => message.messageStatuses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: MessageReadStatus,
    default: MessageReadStatus.SENT,
  })
  status: MessageReadStatus;

  @CreateDateColumn()
  createdAt: Date;
}
