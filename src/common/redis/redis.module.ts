import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {
  constructor(private redisService: RedisService, private configService: ConfigService) {
    this.redisService.connect({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379'),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
    });
  }
}
