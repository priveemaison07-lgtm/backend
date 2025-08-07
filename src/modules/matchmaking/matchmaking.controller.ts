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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MatchmakingService } from './matchmaking.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { CreateBlockDto } from './dto/create-block.dto';

@ApiTags('Matchmaking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post('like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like or dislike a user' })
  @ApiResponse({ status: 200, description: 'Like created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already interacted with this user' })
  async createLike(@Request() req, @Body() createLikeDto: CreateLikeDto) {
    return this.matchmakingService.createLike(req.user.id, createLikeDto);
  }

  @Get('matches')
  @ApiOperation({ summary: 'Get user matches' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of matches to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination' })
  @ApiResponse({ status: 200, description: 'Matches retrieved successfully' })
  async getMatches(
    @Request() req,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.matchmakingService.getMatches(req.user.id, limit, offset);
  }

  @Get('potential-matches')
  @ApiOperation({ summary: 'Get potential matches for user' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of potential matches to return' })
  @ApiResponse({ status: 200, description: 'Potential matches retrieved successfully' })
  async getPotentialMatches(
    @Request() req,
    @Query('limit') limit: number = 10,
  ) {
    return this.matchmakingService.getPotentialMatches(req.user.id, limit);
  }

  @Post('block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already blocked' })
  async blockUser(@Request() req, @Body() createBlockDto: CreateBlockDto) {
    return this.matchmakingService.blockUser(req.user.id, createBlockDto);
  }

  @Delete('block/:blockedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'blockedId', description: 'ID of the user to unblock' })
  @ApiResponse({ status: 204, description: 'User unblocked successfully' })
  @ApiResponse({ status: 404, description: 'Block not found' })
  async unblockUser(@Request() req, @Param('blockedId') blockedId: string) {
    return this.matchmakingService.unblockUser(req.user.id, blockedId);
  }
}
