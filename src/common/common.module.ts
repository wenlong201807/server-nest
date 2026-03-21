import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { MinioModule } from './minio/minio.module';
import { JwtModule } from './jwt/jwt.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    MinioModule,
    JwtModule,
  ],
  exports: [RedisModule, MinioModule, JwtModule],
})
export class CommonModule {}
