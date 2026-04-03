import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {}

  connect(options: { host: string; port: number; password?: string }) {
    this.client = new Redis({
      host: options.host,
      port: options.port,
      password: options.password,
      db: 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Error:', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis Connected');
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string | number, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async delPattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async expire(key: string, ttl: number): Promise<number> {
    return this.client.expire(key, ttl);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async incrBy(key: string, value: number): Promise<number> {
    return this.client.incrby(key, value);
  }

  async decrBy(key: string, value: number): Promise<number> {
    return this.client.decrby(key, value);
  }

  async hSet(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hGet(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hDel(key: string, field: string): Promise<number> {
    return this.client.hdel(key, field);
  }

  async zAdd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zRange(key: string, start: number, end: number): Promise<string[]> {
    return this.client.zrange(key, start, end);
  }

  async zRevRange(key: string, start: number, end: number): Promise<string[]> {
    return this.client.zrevrange(key, start, end);
  }

  async zScore(key: string, member: string): Promise<number | null> {
    const result = await this.client.zscore(key, member);
    return result !== null ? parseFloat(result) : null;
  }

  async zRem(key: string, member: string): Promise<number> {
    return this.client.zrem(key, member);
  }

  async sAdd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async sRem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async sMembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sIsMember(key: string, member: string): Promise<number> {
    return this.client.sismember(key, member);
  }

  async setJson(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
