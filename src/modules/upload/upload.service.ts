import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import sharp from 'sharp';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  private bufferToStream(buffer: Buffer): Readable {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'dating-app',
  ): Promise<{ url: string; publicId: string }> {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const optimizedBuffer = await sharp(file.buffer)
      .resize(800, 800, { fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          format: 'webp',
        },
        (error: Error | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) return reject(error);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      this.bufferToStream(optimizedBuffer).pipe(uploadStream);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder = 'dating-app',
  ): Promise<{ url: string; publicId: string }[]> {
    return await Promise.all(
      files.map((file) => this.uploadImage(file, folder)),
    );
  }

  async uploadVideo(
    file: Express.Multer.File,
    folder = 'dating-app/videos',
  ): Promise<{ url: string; publicId: string }> {
    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Only video files are allowed');
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException('Video must be under 50MB');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'video',
          transformation: [{ width: 720, crop: 'limit', quality: 'auto' }],
        },
        (error: Error | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) return reject(error);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      this.bufferToStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteMedia(
    publicId: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (error) {
      console.error(`Failed to delete ${resourceType}:`, error);
    }
  }
}
