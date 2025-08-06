import { Module, BadRequestException } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../../modules/users/entities/user.entity';
import { UserPreference } from '../../modules/users/entities/user-preference.entity';
import { OtpModule } from '../otp/otp.module';
import { RedisModule } from '../redis/redis.module';
import { AuthController } from './auth.controller';
import { UserModule } from '../../modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, UserPreference]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        const expiresIn = config.get<string>('JWT_EXPIRES_IN', '1h');
        if (!secret) {
          throw new BadRequestException('JWT_SECRET is not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
    OtpModule,
    RedisModule,
    UserModule,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
