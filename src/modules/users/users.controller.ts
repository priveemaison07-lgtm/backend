import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  Post,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  Param,
  Delete,
  Query,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserService } from './users.service';
import { UploadService } from '../upload/upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateUserPreferenceDto } from './dto/user-preference.dto';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly uploadService: UploadService,
  ) {}

  @Get('getProfile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Req() req: Request) {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'User profile retrieved successfully',
      user,
    };
  }
  @Put('updateProfile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Req() req: Request,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.userService.updateProfile(
      req.user.id,
      updateUserDto,
    );
    return {
      statusCode: HttpStatus.OK,
      user,
      message: 'Profile updated successfully',
    };
  }

  @Put('location')
  @ApiOperation({ summary: 'Update user location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  async updateLocation(
    @Req() req: Request,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    const user = await this.userService.updateLocation(
      req.user.id,
      updateLocationDto,
    );
    return {
      statusCode: HttpStatus.OK,
      user,
      message: 'Location updated successfully',
    };
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Req() req: Request,
    @Body() updatePreferencesDto: UpdateUserPreferenceDto,
  ) {
    const preferences = await this.userService.updatePreferences(
      req.user.id,
      updatePreferencesDto,
    );
    return {
      statusCode: HttpStatus.OK,
      preferences,
      message: 'Preferences updated successfully',
    };
  }

  @Post('photos')
  @UseInterceptors(FilesInterceptor('photos', 6))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user photos' })
  @ApiResponse({ status: 200, description: 'Photos uploaded successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadPhotos(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const uploaded = await this.uploadService.uploadMultipleImages(
      files,
      `users/${req.user.id}`,
    );

    const photoUrls = uploaded.map((file) => file.url);
    const user = await this.userService.uploadPhotos(req.user.id, photoUrls);
    return {
      statusCode: HttpStatus.OK,
      user,
      message: 'Photos uploaded successfully',
    };
  }

  @Delete('photos/:photoUrl')
  @ApiOperation({ summary: 'Delete a user photo' })
  @ApiResponse({ status: 200, description: 'Photo deleted successfully' })
  async deletePhoto(@Req() req: Request, @Param('photoUrl') photoUrl: string) {
    const decodedUrl = decodeURIComponent(photoUrl);
    const user = await this.userService.deletePhoto(req.user.id, decodedUrl);
    return {
      statusCode: HttpStatus.OK,
      user,
      message: 'Photo deleted successfully',
    };
  }

  @Put('photos/reorder')
  @ApiOperation({ summary: 'Reorder user photos' })
  @ApiResponse({ status: 200, description: 'Photos reordered successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photoUrls: {
          type: 'array',
          items: {
            type: 'string',
            example: 'https://cdn.domain.com/users/user123/photo1.jpg',
          },
          example: [
            'https://cdn.domain.com/users/user123/photo1.jpg',
            'https://cdn.domain.com/users/user123/photo2.jpg',
          ],
        },
      },
    },
  })
  async reorderPhotos(
    @Req() req: Request,
    @Body() body: { photoUrls: string[] },
  ) {
    const user = await this.userService.reorderPhotos(
      req.user.id,
      body.photoUrls,
    );
    return {
      statusCode: HttpStatus.OK,
      user,
      message: 'Photos reordered successfully',
    };
  }

  @Get('discover')
  @ApiOperation({ summary: 'Discover nearby users' })
  @ApiResponse({
    status: 200,
    description: 'Nearby users retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async discoverUsers(
    @Req() req: Request,
    @Query('location') location: string,
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius: number = 10,
    @Query('maxResults') maxResults: number = 20,
    @Query('minAge') minAge?: number,
    @Query('maxAge') maxAge?: number,
    @Query('maxDistance') maxDistance?: number,
  ) {
    const loc = location ? location : { latitude, longitude };
    const filters = { minAge, maxAge, maxDistance };
    const users = await this.userService.getNearbyUsers(
      loc,
      radius,
      maxResults,
      req.user.id,
      filters,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Nearby users retrieved successfully',
      users,
    };
  }

  @Put('deactivate')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiResponse({ status: 200, description: 'Account deactivated successfully' })
  async deactivateAccount(@Req() req: Request) {
    await this.userService.deactivateAccount(req.user.id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Account deactivated successfully',
    };
  }

  @Delete('deleteAccount')
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async deleteAccount(@Req() req: Request) {
    await this.userService.deleteAccount(req.user.id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Account deleted successfully',
    };
  }
}
