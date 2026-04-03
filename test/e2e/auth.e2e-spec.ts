import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testUserId: number;
  let accessToken: string;
  let refreshToken: string;

  const testMobile = '13900139001';
  const testPassword = 'Test123456';
  const testNickname = 'E2E测试用户';

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

    // Clean up test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function cleanupTestData() {
    try {
      await dataSource.query('DELETE FROM user WHERE mobile IN (?, ?, ?)', [
        testMobile,
        '13900139002',
        '13900139999',
      ]);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe('/api/v1/auth/sms/send (POST)', () => {
    it('should send SMS code successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/sms/send')
        .send({ mobile: testMobile })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('验证码');
        });
    });

    it('should fail when sending too frequently', async () => {
      const testMobile2 = '13900139002';

      // First request
      await request(app.getHttpServer())
        .post('/api/v1/auth/sms/send')
        .send({ mobile: testMobile2 })
        .expect(201);

      // Second request immediately should fail
      return request(app.getHttpServer())
        .post('/api/v1/auth/sms/send')
        .send({ mobile: testMobile2 })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('频繁');
        });
    });

    it('should fail with missing mobile', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/sms/send')
        .send({})
        .expect(400);
    });
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should fail with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          mobile: testMobile,
        })
        .expect(400);
    });

    it('should fail with invalid verification code', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          mobile: '13900139003',
          code: '000000',
          password: testPassword,
          nickname: testNickname,
          gender: 1,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('验证码');
        });
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    beforeAll(async () => {
      // Create a test user directly in database for login tests
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(testPassword, 10);

      try {
        const result = await dataSource.query(
          'INSERT INTO user (mobile, password, nickname, gender, invite_code, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [testMobile, hashedPassword, testNickname, 1, 'TEST001', 0]
        );
        testUserId = result.insertId;
      } catch (error) {
        // User might already exist
        const users = await dataSource.query('SELECT id FROM user WHERE mobile = ?', [testMobile]);
        if (users.length > 0) {
          testUserId = users[0].id;
        }
      }
    });

    it('should login successfully with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: testMobile,
          password: testPassword,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('mobile', testMobile);
          expect(res.body.user).not.toHaveProperty('password');

          // Save tokens for later tests
          accessToken = res.body.token;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: testMobile,
          password: 'WrongPassword123',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('密码错误');
        });
    });

    it('should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: '19999999999',
          password: testPassword,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('用户不存在');
        });
    });

    it('should fail with missing credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });

    it('should fail with disabled account', async () => {
      // Disable the test user account
      await dataSource.query('UPDATE user SET status = 1 WHERE mobile = ?', [testMobile]);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: testMobile,
          password: testPassword,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('账号已被禁用');
        });

      // Re-enable the account for other tests
      await dataSource.query('UPDATE user SET status = 0 WHERE mobile = ?', [testMobile]);
    });
  });

  describe('/api/v1/auth/refresh (POST)', () => {
    it('should refresh token successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.token).not.toBe(accessToken);
        });
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Token 无效或已过期');
        });
    });

    it('should fail with missing refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });

    it('should fail when user is disabled', async () => {
      // Disable the user
      await dataSource.query('UPDATE user SET status = 1 WHERE mobile = ?', [testMobile]);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('账号已被禁用');
        });

      // Re-enable the user
      await dataSource.query('UPDATE user SET status = 0 WHERE mobile = ?', [testMobile]);
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // Step 1: Login with credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: testMobile,
          password: testPassword,
        })
        .expect(201);

      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('refreshToken');
      const flowAccessToken = loginResponse.body.token;
      const flowRefreshToken = loginResponse.body.refreshToken;

      // Step 2: Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: flowRefreshToken })
        .expect(201);

      expect(refreshResponse.body).toHaveProperty('token');
      expect(refreshResponse.body.token).not.toBe(flowAccessToken);

      // Step 3: Access protected endpoint with new token
      const profileResponse = await request(app.getHttpServer())
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.token}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('mobile', testMobile);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty request body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);
    });

    it('should handle SQL injection attempts', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: "13900000001' OR '1'='1",
          password: "password' OR '1'='1",
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('用户不存在');
        });
    });

    it('should handle invalid token format', () => {
      return request(app.getHttpServer())
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle missing authorization header', () => {
      return request(app.getHttpServer())
        .get('/api/v1/user/profile')
        .expect(401);
    });
  });
});
