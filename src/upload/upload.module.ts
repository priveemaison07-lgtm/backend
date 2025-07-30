import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';

@Module({
  imports: [ConfigModule], // Ensure ConfigModule is available
  providers: [UploadService],
  exports: [UploadService], // Export to use in other modules
})
export class UploadModule {}
