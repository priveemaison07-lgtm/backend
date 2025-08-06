import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { GeocodingResultDto } from './dto/geocoding-result.dto';
import { GoogleGeocodeResponse } from './interfaces/geocode-response.interface';
import { CacheEntry } from './interfaces/cache.interface';
import {
  firstValueFrom,
  timer,
  throwError,
  type Observable,
  type OperatorFunction,
} from 'rxjs';
import { retry, scan, mergeMap, timeout, catchError } from 'rxjs/operators';
import { AxiosError, AxiosResponse } from 'axios';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly apiKey: string;
  private readonly geocodeCache = new Map<
    string,
    CacheEntry<GeocodingResultDto>
  >();
  private readonly reverseCache = new Map<string, CacheEntry<string>>();
  private readonly CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly http: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn(
        'Google Maps API key is not set. Geocoding requests will fail.',
      );
    }
  }

  private buildGeocodeUrl(address: string): string {
    const encoded = encodeURIComponent(address.trim());
    return `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${this.apiKey}`;
  }

  private buildReverseUrl(lat: number, lng: number): string {
    return `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
  }

  private isCacheValid<T>(
    entry: CacheEntry<T> | undefined,
  ): entry is CacheEntry<T> {
    return !!entry && entry.expiresAt > Date.now();
  }

  private extractCityCountry(components: any[]): {
    city?: string;
    country?: string;
  } {
    let city: string | undefined;
    let country: string | undefined;

    for (const comp of components) {
      if (
        !city &&
        (comp.types.includes('locality') ||
          comp.types.includes('postal_town') ||
          comp.types.includes('administrative_area_level_1'))
      ) {
        city = comp.long_name;
      }
      if (comp.types.includes('country')) {
        country = comp.long_name;
      }
    }

    return { city, country };
  }

  private async doRequest<T>(url: string): Promise<T> {
    if (!this.apiKey) {
      throw new BadRequestException('Geocoding service not configured');
    }

    const response$: Observable<AxiosResponse<T>> = this.http.get<T>(url).pipe(
      timeout(5000),
      retry({
        count: 3, // total attempts = initial + 2 retries
        delay: (error, attempt) => {
          const backoff = 200 * Math.pow(2, attempt - 1); // 200ms, 400ms, 800ms
          this.logger.warn(
            `Geocoding request failed, retrying attempt ${attempt} after ${backoff}ms: ${
              (error as AxiosError).message || String(error)
            }`,
          );
          return timer(backoff);
        },
        resetOnSuccess: true,
      }),
      catchError((err: AxiosError) => {
        return throwError(() => err);
      }),
    );

    try {
      const axiosResponse = await firstValueFrom(response$);
      return axiosResponse.data as T;
    } catch (err) {
      const msg = (err as AxiosError).message || String(err);
      this.logger.error(
        `HTTP geocoding request failed: ${msg}`,
        (err as any)?.stack,
      );
      throw new InternalServerErrorException(
        'Failed to reach geocoding provider',
      );
    }
  }

  async geocode(address: string): Promise<GeocodingResultDto> {
    if (!address || !address.trim()) {
      throw new BadRequestException('Address is required');
    }

    const cacheKey = address.toLowerCase();
    const cached = this.geocodeCache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      return cached.value;
    }

    const url = this.buildGeocodeUrl(address);
    const data = await this.doRequest<GoogleGeocodeResponse>(url);

    if (
      data.status !== 'OK' ||
      !Array.isArray(data.results) ||
      data.results.length === 0
    ) {
      this.logger.warn(
        `Geocoding API returned no results for "${address}" status=${data.status}`,
      );
      throw new BadRequestException('Address not found');
    }

    const top = data.results[0];
    const location = top.geometry?.location;
    if (
      !location ||
      typeof location.lat !== 'number' ||
      typeof location.lng !== 'number'
    ) {
      throw new BadRequestException('Invalid geocoding response');
    }

    const { city, country } = this.extractCityCountry(
      top.address_components || [],
    );

    const result: GeocodingResultDto = {
      latitude: location.lat,
      longitude: location.lng,
      city,
      country,
      formatted_address: top.formatted_address,
    };

    this.geocodeCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return result;
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<GeocodingResultDto> {
    if (
      latitude === undefined ||
      longitude === undefined ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      throw new BadRequestException(
        'Valid latitude and longitude are required',
      );
    }

    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    const cached = this.reverseCache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      return {
        latitude,
        longitude,
        formatted_address: cached.value,
      } as GeocodingResultDto;
    }

    const url = this.buildReverseUrl(latitude, longitude);
    const data = await this.doRequest<GoogleGeocodeResponse>(url);

    if (
      data.status !== 'OK' ||
      !Array.isArray(data.results) ||
      data.results.length === 0
    ) {
      this.logger.warn(
        `Reverse geocoding API returned no results for (${latitude}, ${longitude}) status=${data.status}`,
      );
      throw new BadRequestException('Location not found');
    }

    const top = data.results[0];
    const formatted_address = top.formatted_address;
    if (!formatted_address) {
      throw new BadRequestException('Invalid reverse geocoding response');
    }

    const { city, country } = this.extractCityCountry(
      top.address_components || [],
    );

    this.reverseCache.set(cacheKey, {
      value: formatted_address,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return {
      latitude,
      longitude,
      formatted_address,
      city,
      country,
    };
  }
}
