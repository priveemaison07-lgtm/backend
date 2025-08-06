import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserPreference } from './user-preference.entity';
import { UserRole } from '../enums/role.enum';
import { AuthProvider } from '../enums/auth-provider.enum';
// import { Match } from '../../matching/entities/match.entity';
// import { Like } from '../../matching/entities/like.entity';
// import { Message } from '../../chat/entities/message.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phoneNumber'], { unique: true })
@Index(['isActive'])
@Index(['latitude', 'longitude'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ unique: true })
  email?: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ nullable: true })
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ nullable: true })
  location?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  country?: string;

  @Column('text', { array: true, default: [] })
  photos: string[];

  @Column({ nullable: true, length: 500 })
  bio?: string;

  @Column({ nullable: true })
  occupation?: string;

  @Column({ nullable: true })
  education?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.PHONE })
  authProvider!: AuthProvider;

  @Column({ nullable: true })
  googleId!: string;

  @Column({ nullable: true })
  appleId?: string;

  @Column({ default: true })
  isProfileComplete?: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen?: Date;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isPremium?: boolean;

  @OneToOne(() => UserPreference, (preference) => preference.user, {
    cascade: true,
  })
  preferences?: UserPreference;

  // @OneToMany(() => Like, (like) => like.liker)
  // likesGiven: Like[];

  // @OneToMany(() => Like, (like) => like.liked)
  // likesReceived: Like[];

  // @OneToMany(() => Match, (match) => match.user1)
  // matchesAsUser1: Match[];

  // @OneToMany(() => Match, (match) => match.user2)
  // matchesAsUser2: Match[];

  // @OneToMany(() => Message, (message) => message.sender)
  // messagesSent: Message[];

  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  //   @OneToMany(() => Match, (match) => match.user1)
  //   matchesAsUser1: Match[];

  //   @OneToMany(() => Match, (match) => match.user2)
  //   matchesAsUser2: Match[];

  //   @OneToMany(() => Message, (message) => message.sender)
  //   sentMessages: Message[];

  //   @OneToMany(() => Message, (message) => message.receiver)
  //   receivedMessages: Message[];
}
