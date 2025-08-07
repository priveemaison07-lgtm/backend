import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiBody({ type: CreateConversationDto })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Cannot create conversation without a match' })
  async createConversation(@Request() req, @Body() createConversationDto: CreateConversationDto) {
    return this.chatService.createConversation(req.user.id, createConversationDto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of conversations to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async getUserConversations(
    @Request() req,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.chatService.getUserConversations(req.user.id, limit, offset);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiParam({ name: 'conversationId', description: 'ID of the conversation' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this conversation' })
  async getConversationById(@Request() req, @Param('conversationId') conversationId: string) {
    return this.chatService.getConversationById(conversationId, req.user.id);
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message' })
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Access denied to this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async createMessage(@Request() req, @Body() createMessageDto: CreateMessageDto) {
    return this.chatService.createMessage(req.user.id, createMessageDto);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages from a conversation' })
  @ApiParam({ name: 'conversationId', description: 'ID of the conversation' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of messages to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this conversation' })
  async getConversationMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.chatService.getConversationMessages(conversationId, req.user.id, limit, offset);
  }

  @Post('conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiParam({ name: 'conversationId', description: 'ID of the conversation' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        messageIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of message IDs to mark as read'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Messages marked as read successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this conversation' })
  async markMessagesAsRead(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body('messageIds') messageIds: string[],
  ) {
    return this.chatService.markMessagesAsRead(conversationId, req.user.id, messageIds);
  }

  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'messageId', description: 'ID of the message to delete' })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Cannot delete this message' })
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    return this.chatService.deleteMessage(messageId, req.user.id);
  }
}
