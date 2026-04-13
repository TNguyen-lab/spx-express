import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Helper functions for caching
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data as T | null;
  },
  
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (ttl) {
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      await redis.set(key, JSON.stringify(value));
    }
  },
  
  async del(key: string): Promise<void> {
    await redis.del(key);
  },
  
  async getPattern<T>(pattern: string): Promise<T[]> {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return [];
    const values = await redis.mget(...keys);
    return values.map(v => JSON.parse(v as string) as T);
  }
};
