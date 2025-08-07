import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Match, MatchStatus } from './entities/match.entity';
import { Like, LikeType } from './entities/like.entity';
import { Block } from './entities/block.entity';
import { User } from '../users/entities/user.entity';
import { CreateLikeDto } from './dto/create-like.dto';
import { CreateBlockDto } from './dto/create-block.dto';

@Injectable()
export class MatchmakingService {
  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(Block)
    private blockRepository: Repository<Block>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createLike(userId: string, createLikeDto: CreateLikeDto): Promise<{ isMatch: boolean; match?: Match }> {
    const { likedId, type, metadata } = createLikeDto;

    // Prevent self-liking
    if (userId === likedId) {
      throw new BadRequestException('Cannot like yourself');
    }

    // Check if user exists
    const likedUser = await this.userRepository.findOne({ where: { id: likedId } });
    if (!likedUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already liked/disliked
    const existingLike = await this.likeRepository.findOne({
      where: { likerId: userId, likedId },
    });

    if (existingLike) {
      throw new ConflictException('Already interacted with this user');
    }

    // Check if blocked
    const isBlocked = await this.isUserBlocked(userId, likedId);
    if (isBlocked) {
      throw new BadRequestException('Cannot interact with blocked user');
    }

    // Create the like
    const like = this.likeRepository.create({
      likerId: userId,
      likedId,
      type,
      metadata,
    });

    await this.likeRepository.save(like);

    // Check for mutual like to create match
    if (type === LikeType.LIKE || type === LikeType.SUPER_LIKE) {
      const mutualLike = await this.likeRepository.findOne({
        where: {
          likerId: likedId,
          likedId: userId,
          type: In([LikeType.LIKE, LikeType.SUPER_LIKE]),
        },
      });

      if (mutualLike) {
        const match = await this.createMatch(userId, likedId);
        return { isMatch: true, match };
      }
    }

    return { isMatch: false };
  }

  async createMatch(user1Id: string, user2Id: string): Promise<Match> {
    // Ensure consistent ordering (smaller UUID first)
    const [firstUserId, secondUserId] = [user1Id, user2Id].sort();

    // Check if match already exists
    const existingMatch = await this.matchRepository.findOne({
      where: {
        user1Id: firstUserId,
        user2Id: secondUserId,
      },
    });

    if (existingMatch) {
      return existingMatch;
    }

    // Calculate compatibility score (basic implementation)
    const compatibilityScore = await this.calculateCompatibilityScore(user1Id, user2Id);

    const match = this.matchRepository.create({
      user1Id: firstUserId,
      user2Id: secondUserId,
      compatibilityScore,
      status: MatchStatus.ACTIVE,
    });

    return this.matchRepository.save(match);
  }

  async getMatches(userId: string, limit: number = 20, offset: number = 0): Promise<Match[]> {
    return this.matchRepository.find({
      where: [
        { user1Id: userId, status: MatchStatus.ACTIVE },
        { user2Id: userId, status: MatchStatus.ACTIVE },
      ],
      relations: ['user1', 'user2'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getPotentialMatches(userId: string, limit: number = 10): Promise<User[]> {
    // Get user preferences
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['preferences'],
    });

    if (!user || !user.preferences) {
      throw new NotFoundException('User or preferences not found');
    }

    // Get users already interacted with (liked/disliked)
    const interactedUserIds = await this.likeRepository
      .createQueryBuilder('like')
      .select('like.likedId')
      .where('like.likerId = :userId', { userId })
      .getRawMany()
      .then(results => results.map(r => r.like_likedId));

    // Get blocked users
    const blockedUserIds = await this.getBlockedUserIds(userId);

    // Get existing matches
    const matchedUserIds = await this.matchRepository
      .createQueryBuilder('match')
      .select('CASE WHEN match.user1Id = :userId THEN match.user2Id ELSE match.user1Id END', 'matchedUserId')
      .where('(match.user1Id = :userId OR match.user2Id = :userId)', { userId })
      .getRawMany()
      .then(results => results.map(r => r.matchedUserId));

    const excludedIds = [...interactedUserIds, ...blockedUserIds, ...matchedUserIds, userId];

    // Build query for potential matches
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.preferences', 'preferences')
      .where('user.id NOT IN (:...excludedIds)', { excludedIds: excludedIds.length > 0 ? excludedIds : [''] })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere('preferences.showMe = :showMe', { showMe: true });

    // Filter by age preferences
    if (user.preferences.minAge && user.preferences.maxAge) {
      query.andWhere(
        'EXTRACT(YEAR FROM AGE(preferences.dateOfBirth)) BETWEEN :minAge AND :maxAge',
        { minAge: user.preferences.minAge, maxAge: user.preferences.maxAge }
      );
    }

    // Filter by gender preferences
    if (user.preferences.interestedIn && user.preferences.interestedIn.length > 0) {
      query.andWhere('preferences.gender IN (:...interestedIn)', {
        interestedIn: user.preferences.interestedIn,
      });
    }

    // Filter by distance if location is available
    if (user.preferences.maxDistance && user.latitude && user.longitude) {
      query.andWhere(
        `ST_DWithin(
          ST_MakePoint(user.longitude, user.latitude)::geography,
          ST_MakePoint(:userLng, :userLat)::geography,
          :maxDistance * 1000
        )`,
        {
          userLng: user.longitude,
          userLat: user.latitude,
          maxDistance: user.preferences.maxDistance,
        }
      );
    }

    return query
      .orderBy('RANDOM()')
      .limit(limit)
      .getMany();
  }

  async blockUser(blockerId: string, createBlockDto: CreateBlockDto): Promise<Block> {
    const { blockedId, reason, description } = createBlockDto;

    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if already blocked
    const existingBlock = await this.blockRepository.findOne({
      where: { blockerId, blockedId },
    });

    if (existingBlock) {
      throw new ConflictException('User already blocked');
    }

    const block = this.blockRepository.create({
      blockerId,
      blockedId,
      reason,
      description,
    });

    // Remove any existing matches
    await this.matchRepository.update(
      [
        { user1Id: blockerId, user2Id: blockedId },
        { user1Id: blockedId, user2Id: blockerId },
      ],
      { status: MatchStatus.BLOCKED }
    );

    return this.blockRepository.save(block);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const block = await this.blockRepository.findOne({
      where: { blockerId, blockedId },
    });

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    await this.blockRepository.remove(block);
  }

  private async isUserBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const block = await this.blockRepository.findOne({
      where: [
        { blockerId: userId, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: userId },
      ],
    });

    return !!block;
  }

  private async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.blockRepository.find({
      where: [
        { blockerId: userId },
        { blockedId: userId },
      ],
    });

    return blocks.map(block => 
      block.blockerId === userId ? block.blockedId : block.blockerId
    );
  }

  private async calculateCompatibilityScore(user1Id: string, user2Id: string): Promise<number> {
    // Basic compatibility calculation based on shared interests
    const user1 = await this.userRepository.findOne({
      where: { id: user1Id },
      relations: ['preferences'],
    });

    const user2 = await this.userRepository.findOne({
      where: { id: user2Id },
      relations: ['preferences'],
    });

    if (!user1?.preferences || !user2?.preferences) {
      return 50; // Default score
    }

    let score = 50; // Base score

    // Interest compatibility
    const user1Interests = user1.preferences.interests || [];
    const user2Interests = user2.preferences.interests || [];
    
    if (user1Interests.length > 0 && user2Interests.length > 0) {
      const commonInterests = user1Interests.filter(interest => 
        user2Interests.includes(interest)
      );
      const interestScore = (commonInterests.length / Math.max(user1Interests.length, user2Interests.length)) * 30;
      score += interestScore;
    }

    // Age compatibility
    if (user1.preferences.dateOfBirth && user2.preferences.dateOfBirth) {
      const age1 = user1.preferences.age;
      const age2 = user2.preferences.age;
      
      if (age1 && age2) {
        const ageDiff = Math.abs(age1 - age2);
        const ageScore = Math.max(0, 20 - ageDiff); // Max 20 points, decreases with age difference
        score += ageScore;
      }
    }

    return Math.min(100, Math.max(0, score));
  }
}
