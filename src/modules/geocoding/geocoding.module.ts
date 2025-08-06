import { Module, Global } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule, HttpModule],
  providers: [GeocodingService],
  exports: [GeocodingService],
})
export class GeocodingModule {}
