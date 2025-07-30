import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}