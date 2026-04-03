import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { UserService } from '../../src/modules/user/user.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { DataSource } from 'typeorm';

/**
 * Create and configure NestJS test application
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Apply global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Apply global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();

  return app;
}

/**
 * Generate JWT token for testing
 */
export function createAuthToken(
  app: INestApplication,
  userId: number,
  mobile: string,
  nickname = 'Test User',
): string {
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);

  const payload = {
    sub: userId,
    mobile,
    nickname,
  };

  return jwtService.sign(payload, {
    secret: configService.get('JWT_SECRET'),
    expiresIn: configService.get('JWT_EXPIRES_IN') || '7d',
  });
}

/**
 * Create test user in database
 */
export async function createTestUser(
  app: INestApplication,
  userData: {
    mobile: string;
    password: string;
    nickname: string;
    gender: number;
    inviteCode?: string;
  },
) {
  const userService = app.get(UserService);
  return await userService.create(userData);
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  const redisService = app.get(RedisService);

  // Clear database tables
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

  const tables = [
    'chat_message',
    'post_report',
    'square_like',
    'square_comment',
    'square_post',
    'user_blacklist',
    'friendship',
    'points_log',
    'certification',
    'user_profile',
    'sign_record',
    'user_violation',
    'file_record',
    'user',
  ];

  for (const table of tables) {
    await dataSource.query(`TRUNCATE TABLE ${table}`);
  }

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

  // Clear Redis cache
  const redis = redisService.getClient();
  const keys = await redis.keys('*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Create Redis mock
 */
export function mockRedis() {
  const store = new Map<string, any>();

  return {
    get: jest.fn((key: string) => Promise.resolve(store.get(key) || null)),
    set: jest.fn((key: string, value: any, ttl?: number) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    setJson: jest.fn((key: string, value: any, ttl?: number) => {
      store.set(key, JSON.stringify(value));
      return Promise.resolve('OK');
    }),
    getJson: jest.fn((key: string) => {
      const value = store.get(key);
      return Promise.resolve(value ? JSON.parse(value) : null);
    }),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
    exists: jest.fn((key: string) => Promise.resolve(store.has(key) ? 1 : 0)),
    keys: jest.fn((pattern: string) => Promise.resolve(Array.from(store.keys()))),
    getClient: jest.fn(() => ({
      keys: jest.fn((pattern: string) => Promise.resolve(Array.from(store.keys()))),
      del: jest.s: string[]) => {
        keys.forEach(key => store.delete(key));
        return Promise.resolve(keys.length);
      }),
    })),
  };
}

/**
 * Create MinIO mock
 */
export function mockMinIO() {
  const buckets = new Map<string, Map<string, any>>();

  return {
    bucketExists: jest.fn((bucketName: string) => {
      return Promise.resolve(buckets.has(bucketName));
    }),
    makeBucket: jest.fn((bucketName: string) => {
      buckets.set(bucketName, new Map());
      return Promise.resolve();
    }),
    putObject: jest.fn((bucketName: string, objectName: string, stream: an=> {
      if (!buckets.has(bucketName)) {
        buckets.set(bucketName, new Map());
      }
      buckets.get(bucketName)!.set(objectName, stream);
      return Promise.resolve({ etag: 'mock-etag' });
    }),
    getObject: jest.fn((bucketName: string, objectName: string) => {
      const bucket = buckets.get(bucketName);
      if (!bucket || !bucket.has(objectName)) {
        return Promise.reject(new Error('Object not found'));
      }
      return Promise.resolve(bucket.get(objectName));
    }),
    removeObject: jest.fn((bucketName: string, objectName: string) => {
      const bucket = buckets.get(bucketName);
      if (bucket) {
        bucket.delete(objectName);
      }
      return Promise.resolve();
    }),
    presignedGetObject: jest.fn((bucketName: string, objectName: string, expiry: number) => {
      return Promise.resolve(`http://mock-minio/${bucketName}/${objectName}`);
    }),
    presignedPutObject: jest.fn((bucketName: string, objectName: string, expiry: number) => {
      return Promise.resolve(`http://mock-minio/${bucketName}/${objectName}?upload=true`);
    }),
  };
}
