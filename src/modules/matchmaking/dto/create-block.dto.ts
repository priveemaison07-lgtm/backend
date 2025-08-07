import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BlockReason } from '../entities/block.entity';

export class CreateBlockDto {
  @ApiProperty({ description: 'ID of the user to block' })
  @IsUUID()
  @IsNotEmpty()
  blockedId: string;

  @ApiPropertyOptional({ enum: BlockReason })
  @IsEnum(BlockReason)
  @IsOptional()
  reason?: BlockReason;

  @ApiPropertyOptional({ description: 'Additional description for the block' })
  @IsString()
  @IsOptional()
  description?: string;
}
