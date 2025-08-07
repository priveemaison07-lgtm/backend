import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;

      // Store connection
      this.connectedUsers.set(client.userId!, client.id);
      
      // Update user online status
      await this.chatService.updateUserOnlineStatus(client.userId!, true);

      // Join user to their personal room
      await client.join(`user:${client.userId}`);

      // Notify about online status
      this.server.emit('user:online', { userId: client.userId });

      this.logger.log(`User ${client.userId} connected with socket ${client.id}`);
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Remove from connected users
      this.connectedUsers.delete(client.userId);
      
      // Update user offline status
      await this.chatService.updateUserOnlineStatus(client.userId, false);

      // Notify about offline status
      this.server.emit('user:offline', { userId: client.userId });

      this.logger.log(`User ${client.userId} disconnected`);
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: CreateMessageDto,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Create message
      const message = await this.chatService.createMessage(client.userId, data);

      // Get conversation to find the other participant
      const conversation = await this.chatService.getConversationById(data.conversationId, client.userId);
      const otherParticipantId = conversation.getOtherParticipant(client.userId);

      // Emit to conversation room
      this.server.to(`conversation:${data.conversationId}`).emit('message:new', {
        message,
        conversationId: data.conversationId,
      });

      // Send push notification to other participant if they're offline
      const otherParticipantSocketId = this.connectedUsers.get(otherParticipantId);
      if (!otherParticipantSocketId) {
        // TODO: Implement push notification service
        this.logger.log(`User ${otherParticipantId} is offline, should send push notification`);
      }

      // Acknowledge message sent
      client.emit('message:sent', { messageId: message.id, tempId: data.tempId });

    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('message:error', { 
        error: error.message,
        tempId: data.tempId 
      });
    }
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Verify user has access to conversation
      await this.chatService.getConversationById(data.conversationId, client.userId);

      // Join conversation room
      await client.join(`conversation:${data.conversationId}`);
      
      client.emit('conversation:joined', { conversationId: data.conversationId });
      
      this.logger.log(`User ${client.userId} joined conversation ${data.conversationId}`);
    } catch (error) {
      this.logger.error('Error joining conversation:', error);
      client.emit('conversation:error', { error: error.message });
    }
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      // Leave conversation room
      await client.leave(`conversation:${data.conversationId}`);
      
      client.emit('conversation:left', { conversationId: data.conversationId });
      
      this.logger.log(`User ${client.userId} left conversation ${data.conversationId}`);
    } catch (error) {
      this.logger.error('Error leaving conversation:', error);
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageIds: string[] },
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      await this.chatService.markMessagesAsRead(data.conversationId, client.userId, data.messageIds);

      // Notify other participants that messages were read
      this.server.to(`conversation:${data.conversationId}`).emit('message:read', {
        conversationId: data.conversationId,
        messageIds: data.messageIds,
        readBy: client.userId,
      });

    } catch (error) {
      this.logger.error('Error marking messages as read:', error);
      client.emit('message:error', { error: error.message });
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    // Notify other participants in conversation
    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    // Notify other participants in conversation
    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  // Helper method to send message to specific user
  async sendToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Helper method to get online users
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}
