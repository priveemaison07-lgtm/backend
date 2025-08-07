import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'ID of the other participant' })
  @IsUUID()
  @IsNotEmpty()
  participantId: string;
}
