import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Gender } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ example: 'I love hiking and coffee', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({ example: 'Software Engineer', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @ApiProperty({ example: 'Bachelor of Science', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  education?: string;

  @ApiProperty({ example: 'New York', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'NY', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'USA', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: ['hiking', 'coffee', 'movies'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];
}
