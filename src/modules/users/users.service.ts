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
import { NearbyUser } from './interfaces/user.interface';
import { GenderInterest } from './enums/gender-interest.enum';
import { Gender } from './enums/gender.enum';
import { GeocodingService } from '../geocoding/geocoding.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPreference)
    private userPreferenceRepository: Repository<UserPreference>,
    private geocodingService: GeocodingService,
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

    const completion = this.calculateProfileCompletion(user);
    user.isProfileComplete = completion >= 50;
    return await this.userRepository.save(user);
  }

  async updateLocation(
    userId: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<User> {
    const user = await this.findById(userId);

    // Set the location string
    user.location = updateLocationDto.location;

    // If coordinates are provided, use them; otherwise geocode the location
    if (updateLocationDto.latitude && updateLocationDto.longitude) {
      user.latitude = updateLocationDto.latitude;
      user.longitude = updateLocationDto.longitude;
      user.city = updateLocationDto.city;
      user.country = updateLocationDto.country;
    } else {
      // Geocode the location to get coordinates
      const geocodingResult = await this.geocodingService.geocode(
        updateLocationDto.location,
      );

      user.latitude = geocodingResult.latitude;
      user.longitude = geocodingResult.longitude;
      user.city = geocodingResult.city || updateLocationDto.city;
      user.country = geocodingResult.country || updateLocationDto.country;
    }

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

  async getNearbyUsers(
    location: string | { latitude: number; longitude: number },
    radius: number = 10,
    maxResults: number = 20,
    userId?: string,
    filters?: { minAge?: number; maxAge?: number; maxDistance?: number }, // Optional filters for user discovery
  ): Promise<NearbyUser[]> {
    let latitude: number;
    let longitude: number;

    if (typeof location === 'string') {
      const coords = await this.geocodingService.geocode(location);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else {
      latitude = location.latitude;
      longitude = location.longitude;
    }

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    const earthRadius = 6371;
    const latChange = (radius / earthRadius) * (180 / Math.PI);
    const lonChange =
      ((radius / earthRadius) * (180 / Math.PI)) /
      Math.cos((latitude * Math.PI) / 180);

    const minLat = latitude - latChange;
    const maxLat = latitude + latChange;
    const minLon = longitude - lonChange;
    const maxLon = longitude + lonChange;

    // Query for nearby users within bounding box
    const qb = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.preferences', 'preferences')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.isProfileComplete = :isProfileComplete', {
        isProfileComplete: true,
      })
      .andWhere('user.latitude BETWEEN :minLat AND :maxLat', { minLat, maxLat })
      .andWhere('user.longitude BETWEEN :minLon AND :maxLon', {
        minLon,
        maxLon,
      });

    // Age filtering
    if (filters?.minAge) {
      qb.andWhere('preferences.age >= :minAge', { minAge: filters.minAge });
    }
    if (filters?.maxAge) {
      qb.andWhere('preferences.age <= :maxAge', { maxAge: filters.maxAge });
    }

    const nearbyUsers = await qb.take(maxResults * 2).getMany();

    const candidatesWithCoords = nearbyUsers.filter(
      (u) =>
        u.latitude !== undefined &&
        u.longitude !== undefined &&
        !isNaN(Number(u.latitude)) &&
        !isNaN(Number(u.longitude)),
    ) as User[];

    const currentUser = userId ? await this.findById(userId) : null;
    const withDistance: NearbyUser[] = candidatesWithCoords
      .map((user) => {
        const dist = this.calculateDistance(
          latitude,
          longitude,
          Number(user.latitude),
          Number(user.longitude),
        );
        const matchPercentage = currentUser
          ? this.calculateMatchPercentage(currentUser, user)
          : 0;
        return {
          ...user,
          fullName: `${user.firstName} ${user.lastName}`,
          distance: dist,
          matchPercentage,
          isOnline: this.isOnline(user.lastSeen ?? null),
        } as NearbyUser;
      })
      .filter((u) => u.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults);

    return withDistance;
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
    return R * c;
  }

  private isOnline(lastSeen: Date | null): boolean {
    if (!lastSeen) return false;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes
    return lastSeen > fiveMinutesAgo;
  }

  private mapGenderToInterest(gender: Gender): GenderInterest {
    switch (gender) {
      case Gender.MALE:
        return GenderInterest.MALE;
      case Gender.FEMALE:
        return GenderInterest.FEMALE;
      case Gender.OTHER:
        return GenderInterest.BOTH; // Map OTHER to BOTH as a reasonable fallback
      default:
        // This should never happen due to exhaustive switch, but TypeScript requires a default
        throw new Error(`Unsupported gender value: ${gender}`);
    }
  }

  private calculateProfileCompletion(user: User): number {
    let completed = 0;
    const total = 6; // Display name, DOB, gender, location, photos, bio

    if (user.firstName && user.lastName) completed++; // Display name
    if (user.preferences?.dateOfBirth) completed++; // DOB
    if (user.preferences?.gender) completed++; // Gender
    if (user.latitude && user.longitude) completed++; // Location
    if (user.photos?.length >= 2) completed++; // Photos (minimum 2)
    if (user.bio) completed++; // Bio

    return Math.round((completed / total) * 100);
  }

  private calculateMatchPercentage(user: User, otherUser: User): number {
    let score = 0;
    const maxScore = 100;

    // Compare gender interest
    if (
      user.preferences?.interestedIn &&
      otherUser.preferences?.gender &&
      (user.preferences.interestedIn.includes(GenderInterest.BOTH) ||
        user.preferences.interestedIn.includes(
          this.mapGenderToInterest(otherUser.preferences.gender),
        ))
    ) {
      score += 20;
    }

    // Compare age (within preference range)
    const otherAge = otherUser.preferences?.age ?? 0; // Default to 0 if null
    if (
      otherAge !== undefined &&
      user.preferences?.minAge !== undefined &&
      user.preferences?.maxAge !== undefined &&
      otherAge >= user.preferences.minAge &&
      otherAge <= user.preferences.maxAge
    ) {
      score += 20;
    }

    // Compare interests (simple overlap)
    if (user.preferences?.interests && otherUser.preferences?.interests) {
      const commonInterests = user.preferences.interests.filter((interest) =>
        otherUser.preferences?.interests.includes(interest),
      ).length;
      score +=
        (commonInterests /
          Math.max(user.preferences.interests.length || 1, 1)) *
        30;
    }

    // Compare location distance (within maxDistance)
    const distance = this.calculateDistance(
      user.latitude || 0,
      user.longitude || 0,
      otherUser.latitude || 0,
      otherUser.longitude || 0,
    );
    if (
      user.preferences?.maxDistance !== undefined &&
      distance <= user.preferences.maxDistance
    ) {
      score += 30;
    }

    return Math.min(Math.round((score / maxScore) * 100), 100);
  }
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
