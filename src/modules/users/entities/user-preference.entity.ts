import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User, Gender } from './user.entity';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: Gender, array: true })
  interestedIn: Gender[];

  @Column({ type: 'simple-array', nullable: true }) // Store hobbies as an array of strings
  hobbies?: string[];

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'date' })
  dateOfBirth?: Date;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender?: Gender;

  @Column({ type: 'point', nullable: true })
  location!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: number;

  @Column({ nullable: true })
  city!: string;

  @Column({ nullable: true })
  country!: string;

  @Column({ nullable: true })
  heightCm?: number;

  @Column({ nullable: true })
  smokingHabit?: string;

  @Column({ nullable: true })
  drinkingHabit?: string;

  @Column({ nullable: true, length: 300 })
  about?: string;

  @Column({ default: 18 })
  minAge: number;

  @Column({ default: 60 })
  maxAge: number;

  @Column({ default: 50 })
  maxDistance: number;

  @Column({ type: 'json', array: true, default: [], nullable: true })
  interests: string[];

  @Column({ nullable: true })
  occupation!: string;

  @Column({ nullable: true })
  education!: string;

  @Column({ default: true })
  showMe: boolean;

  @Column({ default: true })
  showDistance: boolean;

  @Column({ default: true })
  showAge: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get age(): number | null {
    if (!this.dateOfBirth) return null;

    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  @OneToOne(() => User, (user) => user.preferences)
  @JoinColumn({ name: 'userId' })
  user: User;
}
