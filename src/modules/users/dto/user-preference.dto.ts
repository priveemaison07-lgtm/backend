import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsArray,
  ArrayMinSize,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { Gender } from '../entities/user.entity';

export class UpdateUserPreferenceDto {
  @ApiProperty({
    example: [Gender.FEMALE],
    enum: Gender,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Gender, { each: true })
  interestedIn?: Gender[];

  @ApiProperty({ example: 18, minimum: 18, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(100)
  minAge?: number;

  @ApiProperty({ example: 30, minimum: 18, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(100)
  maxAge?: number;

  @ApiProperty({ example: 50, minimum: 1, maximum: 500, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  maxDistance?: number;

  @ApiProperty({ example: ['hiking', 'coffee', 'movies'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showMe?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showDistance?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showAge?: boolean;
}
