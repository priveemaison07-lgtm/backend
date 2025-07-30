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
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({
    example: 'Lagos, Nigeria',
    description: 'Full address that will be geocoded to get coordinates',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    example: 6.5244,
    description:
      'Latitude coordinate (will be auto-generated from location if not provided)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    example: 3.3792,
    description:
      'Longitude coordinate (will be auto-generated from location if not provided)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    example: 'Lagos',
    description:
      'City name (will be auto-extracted from location if not provided)',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Oyo', description: 'State name (will be auto-extracted from location if not provided)', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    example: 'Nigeria',
    description:
      'Country name (will be auto-extracted from location if not provided)',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;
}
