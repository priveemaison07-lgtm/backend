import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserPreference } from './entities/user-preference.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateUserPreferenceDto } from './dto/user-preference.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPreference)
    private userPreferenceRepository: Repository<UserPreference>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, isActive: true },
      relations: ['preferences'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findById(userId);

    const { dateOfBirth, gender, ...userFields } = updateUserDto;

    // Update user fields
    Object.assign(user, userFields);

    // Handle preference fields separately if they exist
    if (dateOfBirth || gender) {
      if (!user.preferences) {
        user.preferences = this.userPreferenceRepository.create({
          userId: user.id,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
        });
      } else {
        if (dateOfBirth) user.preferences.dateOfBirth = new Date(dateOfBirth);
        if (gender) user.preferences.gender = gender;
      }
    }

    return await this.userRepository.save(user);
  }
  async updateLocation(
    userId: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<User> {
    const user = await this.findById(userId);

    // Update location fields
    Object.assign(user, updateLocationDto);

    return await this.userRepository.save(user);
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdateUserPreferenceDto,
  ): Promise<UserPreference> {
    const user = await this.findById(userId);

    let preferences = await this.userPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.userPreferenceRepository.create({
        ...updatePreferencesDto,
        user,
      });
    } else {
      Object.assign(preferences, updatePreferencesDto);
    }

    return await this.userPreferenceRepository.save(preferences);
  }

  async uploadPhotos(userId: string, photoUrls: string[]): Promise<User> {
    const user = await this.findById(userId);

    if (!user.photos) {
      user.photos = [];
    }

    // Add new photos (maximum 6 photos)
    const totalPhotos = user.photos.length + photoUrls.length;
    if (totalPhotos > 6) {
      throw new BadRequestException('Maximum 6 photos allowed');
    }

    user.photos = [...user.photos, ...photoUrls];

    return await this.userRepository.save(user);
  }

  async deletePhoto(userId: string, photoUrl: string): Promise<User> {
    const user = await this.findById(userId);

    if (!user.photos || !user.photos.includes(photoUrl)) {
      throw new NotFoundException('Photo not found');
    }

    user.photos = user.photos.filter((url) => url !== photoUrl);

    return await this.userRepository.save(user);
  }

  async reorderPhotos(userId: string, photoUrls: string[]): Promise<User> {
    const user = await this.findById(userId);

    // Validate that all provided URLs exist in user's photos
    const invalidUrls = photoUrls.filter((url) => !user.photos?.includes(url));
    if (invalidUrls.length > 0) {
      throw new BadRequestException('Invalid photo URLs provided');
    }

    user.photos = photoUrls;

    return await this.userRepository.save(user);
  }

  async deactivateAccount(userId: string): Promise<void> {
    const user = await this.findById(userId);
    user.isActive = false;
    await this.userRepository.save(user);
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.findById(userId);

    // Soft delete - set account as inactive and clear personal data
    user.isActive = false;
    user.firstName = 'Deleted';
    user.lastName = 'User';
    user.email = undefined;
    user.bio = undefined;
    user.photos = [];
    user.occupation = undefined;
    user.education = undefined;

    await this.userRepository.save(user);
  }

  async updateLastSeen(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastSeen: new Date() });
  }

  async getNearbyUsers(userId: string, limit: number = 10): Promise<User[]> {
    const user = await this.findById(userId);

    if (!user.latitude || !user.longitude || !user.preferences) {
      return [];
    }

    const { preferences } = user;
    const currentYear = new Date().getFullYear();

    // Calculate age range based on birth year
    const maxBirthYear = currentYear - preferences.minAge;
    const minBirthYear = currentYear - preferences.maxAge;

    // This is a simplified query. In production, you'd use a proper geo-spatial query
    const nearbyUsers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.preferences', 'preferences')
      .where('user.id != :userId', { userId })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere('user.gender IN (:...interestedIn)', {
        interestedIn: preferences.interestedIn,
      })
      .andWhere(
        'YEAR(user.dateOfBirth) BETWEEN :minBirthYear AND :maxBirthYear',
        {
          minBirthYear,
          maxBirthYear,
        },
      )
      .andWhere('user.latitude IS NOT NULL')
      .andWhere('user.longitude IS NOT NULL')
      .limit(limit)
      .getMany();

    // Filter by distance (simplified calculation)
    return nearbyUsers.filter((nearbyUser) => {
      const distance = this.calculateDistance(
        user.latitude!,
        user.longitude!,
        nearbyUser.latitude!,
        nearbyUser.longitude!,
      );
      return distance <= preferences.maxDistance;
    });
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
