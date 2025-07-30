export interface JwtPayload {
  sub: string;
  email?: string;
  phoneNumber: string;
  isActive?: boolean;
  isVerified?: boolean;
  iat?: number;
  exp?: number;
}
