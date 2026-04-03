import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

// 全局测试超时
jest.setTimeout(30000);

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    quit: jest.fn(),
  }));
});

// Mock MinIO
jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(undefined),
    putObject: jest.fn().mockResolvedValue(undefined),
    removeObject: jest.fn().mockResolvedValue(undefined),
    presignedGetObject: jest.fn().mockResolvedValue('http://mock-url'),
  })),
}));

// 全局清理
afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
});

