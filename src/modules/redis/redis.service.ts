import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.cacheManager.set(key, value, ttlSeconds * 1000); // TTL in ms
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  // Optional - remove if unsupported by store
  // async reset(): Promise<void> {
  //   if (typeof (this.cacheManager as any).reset === 'function') {
  //     await (this.cacheManager as any).reset();
  //   }
  // }
}
