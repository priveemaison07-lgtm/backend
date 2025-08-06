import { User } from '../entities/user.entity';

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateUser {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface NearbyUser extends User {
  distance: number;
  matchPercentage: number;
}
