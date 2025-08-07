import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../entities/message.entity';

export class CreateMessageDto {
  @ApiProperty({ description: 'ID of the conversation' })
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  @ApiPropertyOptional({ description: 'ID of the message being replied to' })
  @IsUUID()
  @IsOptional()
  replyToMessageId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the message' })
  @IsOptional()
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
  };

  @ApiPropertyOptional({ description: 'Temporary ID for client-side tracking' })
  @IsString()
  @IsOptional()
  tempId?: string;
}
