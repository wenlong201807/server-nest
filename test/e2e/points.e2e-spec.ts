import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Points API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: number;

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

    const testUser = {
      mobile: '13900000100',
      password: 'Test123456',
      nickname: 'Points测试用户',
      gender: 1,
      inviteCode: 'POINTS100',
    };

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    userId = registerRes.body.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        mobile: testUser.mobile,
        password: testUser.password,
      });

    accessToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/points/balance (GET)', () => {
    it('should get user points balance', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/balance')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('balance');
          expect(res.body).toHaveProperty('totalEarned');
          expect(res.body).toHaveProperty('totalConsumed');
          expect(typeof res.body.balance).toBe('number');
          expect(typeof res.body.totalEarned).toBe('number');
          expect(typeof res.body.totalConsumed).toBe('number');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/balance')
        .expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/balance')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  describe('/api/v1/points/sign/status (GET)', () => {
    it('should get sign-in status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/sign/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('signedToday');
          expect(res.body).toHaveProperty('continuousDays');
          expect(typeof res.body.signedToday).toBe('boolean');
          expect(typeof res.body.continuousDays).toBe('number');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/sign/status')
        .expect(401);
    });
  });

  describe('/api/v1/points/sign (POST)', () => {
    it('should sign in successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/points/sign')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('pointsEarned');
          expect(res.body).toHaveProperty('continuousDays');
          expect(res.body).toHaveProperty('balance');
          expect(res.body.pointsEarned).toBeGreaterThan(0);
          expect(res.body.continuousDays).toBeGreaterThanOrEqual(1);
          expect(typeof res.body.balance).toBe('number');
        });
    });

    it('should fail when signing in twice on same day', () => {
      return request(app.getHttpServer())
        .post('/api/v1/points/sign')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/points/sign')
        .expect(401);
    });
  });

  describe('/api/v1/points/logs (GET)', () => {
    it('should get points logs with default pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/logs?page=1&pageSize=20')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('list');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('pageSize');
          expect(Array.isArray(res.body.list)).toBe(true);
          expect(res.body.page).toBe(1);
          expect(res.body.pageSize).toBe(20);
        });
    });

    it('should get points logs with custom pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/logs?page=1&pageSize=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.pageSize).toBe(10);
        });
    });

    it('should filter logs by type (earn)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/logs?page=1&pageSize=20&type=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('list');
          if (res.body.list.length > 0) {
            res.body.list.forEach((log: any) => {
              expect(log.type).toBe(1);
            });
          }
        });
    });

    it('should filter logs by type (consume)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/logs?page=1&pageSize=20&type=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('list');
          if (res.body.list.length > 0) {
            res.body.list.forEach((log: any) => {
              expect(log.type).toBe(2);
            });
          }
        });
    });

    it('should return logs with correct structure', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/logs?page=1&pageSize=20')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          if (res.body.list.length > 0) {
            const log = res.body.list[0];
            expect(log).toHaveProperty('id');
            expect(log).toHaveProperty('userId');
            expect(log).toHaveProperty('type');
            expect(log).toHaveProperty('amount');
            expect(log).toHaveProperty('balanceAfter');
            expect(log).toHaveProperty('sourceType');
            expect(log).toHaveProperty('description');
            expect(log).toHaveProperty('createdAt');
          }
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/logs?page=1&pageSize=20')
        .expect(401);
    });

    it('should handle invalid page parameter', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/logs?page=invalid&pageSize=20')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should handle invalid pageSize parameter', () => {
      return request(app.getHttpServer())
        .get('/api/v1/points/logs?page=1&pageSize=invalid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('Points workflow integration', () => {
    let testAccessToken: string;

    beforeAll(async () => {
      const testUser = {
        mobile: '13900000101',
        password: 'Test123456',
        nickname: 'Workflow测试用户',
        gender: 1,
        inviteCode: 'WORKFLOW101',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: testUser.mobile,
          password: testUser.password,
        });

      testAccessToken = loginRes.body.access_token;
    });

    it('should complete full points workflow', async () => {
      const balanceBefore = await request(app.getHttpServer())
        .get('/api/v1/points/balance')
        .set('Authorization', `Bearer ${testAccessToken}`);

      const initialBalance = balanceBefore.body.balance;

      const signRes = await request(app.getHttpServer())
        .post('/api/v1/points/sign')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(201);

      expect(signRes.body.pointsEarned).toBeGreaterThan(0);
      const pointsEarned = signRes.body.pointsEarned;

      const balanceAfter = await request(app.getHttpServer())
        .get('/api/v1/points/balance')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(200);

      expect(balanceAfter.body.balance).toBe(initialBalance + pointsEarned);

      const logsRes = await request(app.getHttpServer())
        .get('/api/v1/points/logs?page=1&pageSize=20')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(200);

      expect(logsRes.body.list.length).toBeGreaterThan(0);
      const latestLog = logsRes.body.list[0];
      expect(latestLog.amount).toBe(pointsEarned);
      expect(latestLog.type).toBe(1);
      expect(latestLog.sourceType).toBe('sign');

      const statusRes = await request(app.getHttpServer())
        .get('/api/v1/points/sign/status')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .expect(200);

      expect(statusRes.body.signedToday).toBe(true);
      expect(statusRes.body.continuousDays).toBeGreaterThanOrEqual(1);
    });
  });
});
