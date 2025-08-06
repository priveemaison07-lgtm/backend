import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { User } from './entities/user.entity';
import { UserPreference } from './entities/user-preference.entity';
import { UploadModule } from '../upload/upload.module';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserPreference]),
    UploadModule,
    GeocodingModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
