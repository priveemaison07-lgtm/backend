export interface JwtPayload {
  sub: string;
  email?: string;
  phoneNumber?: string;
  role: 'user' | 'admin' | 'moderator';
  iat?: number;
  exp?: number;
}
