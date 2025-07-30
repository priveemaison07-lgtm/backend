import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../../modules/users/entities/user.entity';
import { UserPreference } from '../../modules/users/entities/user-preference.entity';
import { OtpModule } from '../../otp/otp.module';
import { RedisModule } from '../../redis/redis.module';
import { AuthController } from './auth.controller';
import { UserModule } from '../../modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserPreference]),
    PassportModule,
    JwtModule.register({}), // Already configured globally in AppModule
    OtpModule,
    RedisModule,
    UserModule,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
