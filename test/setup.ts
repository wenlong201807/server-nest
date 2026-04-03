import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

// 全局测试超时
jest.setTimeout(30000);

// 全局清理
afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
});
