export interface JwtPayload {
  sub: string;
  email?: string;
  phoneNumber: string;
  role: 'user' | 'admin' | 'moderator';
  isActive?: boolean;
  isVerified?: boolean;
  iat?: number;
  exp?: number;
}
