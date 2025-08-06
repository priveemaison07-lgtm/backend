import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/role.enum';

declare module 'express' {
  interface Request {
    user: User;
    email: string;
    phoneNumber: string;
    role: UserRole;
    authProvider?: string; // Optional, if you want to track the auth provider
    full?: User;
  }
}
export {};
