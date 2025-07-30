import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum OtpType {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  PASSWORD_RESET = 'password_reset',
}

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  phoneNumber: string;

  @Column()
  code: string;

  @Column({ type: 'enum', enum: OtpType })
  type: OtpType;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
