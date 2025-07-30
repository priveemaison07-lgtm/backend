import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  Post,
  UseInterceptors,
  UploadedFiles,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserService } from './users.service';
import { UploadService } from '../../upload/upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateUserPreferenceDto } from './dto/user-preference.dto';

@ApiTags('User')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly uploadService: UploadService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  async getProfile(@Req() req) {
    const user = await this.userService.findById(req.user.id);
    return { user };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.userService.updateProfile(
      req.user.id,
      updateUserDto,
    );
    return { user, message: 'Profile updated successfully' };
  }

  @Put('location')
  @ApiOperation({ summary: 'Update user location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  async updateLocation(
    @Req() req,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    const user = await this.userService.updateLocation(
      req.user.id,
      updateLocationDto,
    );
    return { user, message: 'Location updated successfully' };
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Req() req,
    @Body() updatePreferencesDto: UpdateUserPreferenceDto,
  ) {
    const preferences = await this.userService.updatePreferences(
      req.user.id,
      updatePreferencesDto,
    );
    return { preferences, message: 'Preferences updated successfully' };
  }

  @Post('photos')
  @UseInterceptors(FilesInterceptor('photos', 6))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user photos' })
  @ApiResponse({ status: 200, description: 'Photos uploaded successfully' })
  async uploadPhotos(
    @Req() req,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const uploaded = await this.uploadService.uploadMultipleImages(
      files,
      `users/${req.user.id}`,
    );

    const photoUrls = uploaded.map((file) => file.url);
    const user = await this.userService.uploadPhotos(req.user.id, photoUrls);
    return { user, message: 'Photos uploaded successfully' };
  }

  @Delete('photos/:photoUrl')
  @ApiOperation({ summary: 'Delete a user photo' })
  @ApiResponse({ status: 200, description: 'Photo deleted successfully' })
  async deletePhoto(@Req() req, @Param('photoUrl') photoUrl: string) {
    const decodedUrl = decodeURIComponent(photoUrl);
    const user = await this.userService.deletePhoto(req.user.id, decodedUrl);
    return { user, message: 'Photo deleted successfully' };
  }

  @Put('photos/reorder')
  @ApiOperation({ summary: 'Reorder user photos' })
  @ApiResponse({ status: 200, description: 'Photos reordered successfully' })
  async reorderPhotos(@Req() req, @Body() body: { photoUrls: string[] }) {
    const user = await this.userService.reorderPhotos(
      req.user.id,
      body.photoUrls,
    );
    return { user, message: 'Photos reordered successfully' };
  }

  @Get('discover')
  @ApiOperation({ summary: 'Discover nearby users' })
  @ApiResponse({
    status: 200,
    description: 'Nearby users retrieved successfully',
  })
  async discoverUsers(@Req() req, @Query('limit') limit?: number) {
    const users = await this.userService.getNearbyUsers(req.user.id, limit);
    return { users };
  }

  @Put('deactivate')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiResponse({ status: 200, description: 'Account deactivated successfully' })
  async deactivateAccount(@Req() req) {
    await this.userService.deactivateAccount(req.user.id);
    return { message: 'Account deactivated successfully' };
  }

  @Delete('account')
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async deleteAccount(@Req() req) {
    await this.userService.deleteAccount(req.user.id);
    return { message: 'Account deleted successfully' };
  }
}
