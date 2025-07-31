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

export enum GenderInterest {
  MALE = 'male',
  FEMALE = 'female',
  BOTH = 'both',
}

@Entity('user_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @OneToOne(() => User, (user) => user.preferences)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: GenderInterest,
    enumName: 'gender_interest_enum',
    array: true,
  })
  interestedIn: GenderInterest[];

  @Column({ type: 'simple-array', nullable: true })
  hobbies?: string[];

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    enumName: 'gender_enum',
    nullable: true,
  })
  gender?: Gender;

  @Column({ type: 'point', nullable: true })
  location?: object; // Typically: { type: 'Point', coordinates: [longitude, latitude] }

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  country?: string;

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

  @Column({ type: 'json', nullable: true, default: [] })
  interests: string[];

  @Column({ nullable: true })
  occupation?: string;

  @Column({ nullable: true })
  education?: string;

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
}
