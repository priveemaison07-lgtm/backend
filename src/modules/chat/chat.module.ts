import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { MessageStatus } from './entities/message-status.entity';
import { User } from '../users/entities/user.entity';
import { Match } from '../matchmaking/entities/match.entity';
import { UserModule } from '../users/users.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, MessageStatus]),
    UserModule,
    MatchmakingModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
