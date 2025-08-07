import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { Message, MessageType, MessageStatusEnum } from './entities/message.entity';
import { MessageStatus, MessageReadStatus } from './entities/message-status.entity';
import { User } from '../users/entities/user.entity';
import { Match, MatchStatus } from '../matchmaking/entities/match.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(MessageStatus)
    private messageStatusRepository: Repository<MessageStatus>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
  ) {}

  async createConversation(userId: string, createConversationDto: CreateConversationDto): Promise<Conversation> {
    const { participantId } = createConversationDto;

    if (userId === participantId) {
      throw new BadRequestException('Cannot create conversation with yourself');
    }

    // Check if users are matched
    const match = await this.matchRepository.findOne({
      where: [
        { user1Id: userId, user2Id: participantId, status: MatchStatus.ACTIVE },
        { user1Id: participantId, user2Id: userId, status: MatchStatus.ACTIVE },
      ],
    });

    if (!match) {
      throw new ForbiddenException('Cannot create conversation without a match');
    }

    // Check if conversation already exists
    const existingConversation = await this.conversationRepository.findOne({
      where: [
        { participant1Id: userId, participant2Id: participantId },
        { participant1Id: participantId, participant2Id: userId },
      ],
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Ensure consistent ordering (smaller UUID first)
    const [participant1Id, participant2Id] = [userId, participantId].sort();

    const conversation = this.conversationRepository.create({
      participant1Id,
      participant2Id,
      status: ConversationStatus.ACTIVE,
    });

    const savedConversation = await this.conversationRepository.save(conversation);

    // Update match to indicate conversation started
    await this.matchRepository.update(match.id, { isConversationStarted: true });

    return savedConversation;
  }

  async getUserConversations(userId: string, limit: number = 20, offset: number = 0): Promise<Conversation[]> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participant1', 'participant1')
      .leftJoinAndSelect('conversation.participant2', 'participant2')
      .leftJoinAndSelect('conversation.messages', 'lastMessage', 'lastMessage.id = conversation.lastMessageId')
      .where('(conversation.participant1Id = :userId OR conversation.participant2Id = :userId)', { userId })
      .andWhere('conversation.status = :status', { status: ConversationStatus.ACTIVE })
      .orderBy('conversation.lastMessageAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();
  }

  async getConversationById(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participant1', 'participant2'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is participant
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    return conversation;
  }

  async createMessage(userId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    const { conversationId, content, messageType = MessageType.TEXT, replyToMessageId, metadata } = createMessageDto;

    // Verify conversation exists and user is participant
    const conversation = await this.getConversationById(conversationId, userId);

    // Create message
    const message = this.messageRepository.create({
      conversationId,
      senderId: userId,
      content,
      messageType,
      replyToMessageId,
      metadata,
      status: MessageStatusEnum.SENT,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update conversation last message info
    await this.conversationRepository.update(conversationId, {
      lastMessageId: savedMessage.id,
      lastMessageAt: savedMessage.createdAt,
    });

    // Update unread counts
    const otherParticipantId = conversation.getOtherParticipant(userId);
    if (conversation.participant1Id === otherParticipantId) {
      await this.conversationRepository.increment(
        { id: conversationId },
        'participant1UnreadCount',
        1
      );
    } else {
      await this.conversationRepository.increment(
        { id: conversationId },
        'participant2UnreadCount',
        1
      );
    }

    // Create message status for the recipient
    await this.messageStatusRepository.save({
      messageId: savedMessage.id,
      userId: otherParticipantId,
      status: MessageReadStatus.DELIVERED,
    });

    const messageWithRelations = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'replyToMessage'],
    });

    return messageWithRelations!;
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    // Verify user has access to conversation
    await this.getConversationById(conversationId, userId);

    return this.messageRepository.find({
      where: { 
        conversationId,
        isDeleted: false,
      },
      relations: ['sender', 'replyToMessage', 'messageStatuses'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async markMessagesAsRead(conversationId: string, userId: string, messageIds: string[]): Promise<void> {
    // Verify user has access to conversation
    const conversation = await this.getConversationById(conversationId, userId);

    // Update message statuses
    await this.messageStatusRepository
      .createQueryBuilder()
      .update(MessageStatus)
      .set({ status: MessageReadStatus.READ })
      .where('messageId IN (:...messageIds)', { messageIds })
      .andWhere('userId = :userId', { userId })
      .execute();

    // Reset unread count for this user
    if (conversation.participant1Id === userId) {
      await this.conversationRepository.update(conversationId, {
        participant1UnreadCount: 0,
      });
    } else {
      await this.conversationRepository.update(conversationId, {
        participant2UnreadCount: 0,
      });
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['conversation'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is sender or participant
    if (message.senderId !== userId) {
      const conversation = message.conversation;
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw new ForbiddenException('Cannot delete this message');
      }
    }

    // Soft delete
    await this.messageRepository.update(messageId, {
      isDeleted: true,
      content: 'This message was deleted',
    });
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.userRepository.update(userId, {
      lastSeen: isOnline ? new Date() : new Date(),
    });
  }

  async getOnlineUsers(userIds: string[]): Promise<string[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineUsers = await this.userRepository
      .createQueryBuilder('user')
      .select('user.id')
      .where('user.id IN (:...userIds)', { userIds })
      .andWhere('user.lastSeen > :fiveMinutesAgo', { fiveMinutesAgo })
      .getRawMany();

    return onlineUsers.map(user => user.user_id);
  }
}
