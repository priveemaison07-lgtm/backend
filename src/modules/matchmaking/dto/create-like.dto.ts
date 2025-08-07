import { IsEnum, IsNotEmpty, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LikeType } from '../entities/like.entity';

class LocationDto {
  @ApiProperty()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty()
  @IsNotEmpty()
  longitude: number;
}

class MetadataDto {
  @ApiPropertyOptional({ enum: ['left', 'right', 'up'] })
  @IsOptional()
  swipeDirection?: 'left' | 'right' | 'up';

  @ApiPropertyOptional()
  @IsOptional()
  deviceInfo?: string;

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}

export class CreateLikeDto {
  @ApiProperty({ description: 'ID of the user being liked/disliked' })
  @IsUUID()
  @IsNotEmpty()
  likedId: string;

  @ApiProperty({ enum: LikeType, default: LikeType.LIKE })
  @IsEnum(LikeType)
  @IsOptional()
  type?: LikeType = LikeType.LIKE;

  @ApiPropertyOptional({ type: MetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;
}
