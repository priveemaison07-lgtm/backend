import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { User } from './entities/user.entity';
import { UserPreference } from './entities/user-preference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPreference])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
