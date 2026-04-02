import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth/register (POST)', () => {
    const testUser = {
      mobile: '13900000001',
      password: 'Test123456',
      nickname: 'E2E测试用户',
      gender: 1,
      inviteCode: 'E2ETEST01',
    };

    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('mobile', testUser.mobile);
          expect(res.body).toHaveProperty('nickname', testUser.nickname);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should fail with duplicate mobile', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should fail with invalid mobile format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          mobile: '123',
        })
        .expect(400);
    });

    it('should fail with short password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          mobile: '13900000002',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should login successfully with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: '13900000001',
          password: 'Test123456',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('mobile', '13900000001');
        });
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: '13900000001',
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: '19999999999',
          password: 'Test123456',
        })
        .expect(401);
    });
  });
});
