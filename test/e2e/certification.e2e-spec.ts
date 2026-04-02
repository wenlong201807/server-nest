import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { CertificationType, CertificationStatus } from '../../src/common/constants';

describe('Certification API (e2e)', () => {
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

    // Register and login a test user
    const testUser = {
      mobile: '13900000100',
      password: 'Test123456',
      nickname: '认证测试用户',
      gender: 1,
      inviteCode: 'CERT001',
    };

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        mobile: testUser.mobile,
        password: testUser.password,
      })
      .expect(200);

    accessToken = loginResponse.body.access_token;
    userId = loginResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/certification (POST)', () => {
    it('should submit ID card certification successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/certification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: CertificationType.ID_CARD,
          imageUrl: 'https://example.com/id-card.jpg',
          description: '身份证认证',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('userId', userId);
          expect(res.body).toHaveProperty('type', CertificationType.ID_CARD);
          expect(res.body).toHaveProperty('status', CertificationStatus.PENDING);
          expect(res.body).toHaveProperty('imageUrl', 'https://example.com/id-card.jpg');
        });
    });

    it('should submit education certification successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/certification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: CertificationType.EDUCATION,
          imageUrl: 'https://example.com/diploma.jpg',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('type', CertificationType.EDUCATION);
          expect(res.body).toHaveProperty('status', CertificationStatus.PENDING);
        });
    });

    it('should submit house certification successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/certification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: CertificationType.HOUSE,
          imageUrl: 'https://example.com/house-cert.jpg',
          description: '房产证明',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('type', CertificationType.HOUSE);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/certification')
        .send({
          type: CertificationType.ID_CARD,
          imageUrl: 'https://example.com/id-card.jpg',
        })
        .expect(401);
    });

    it('should fail with invalid certification type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/certification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'invalid_type',
          imageUrl: 'https://example.com/cert.jpg',
        })
        .expect(400);
    });

    it('should fail without imageUrl', () => {
      return request(app.getHttpServer())
        .post('/api/v1/certification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: CertificationType.ID_CARD,
        })
        .expect(400);
    });

    it('should fail with empty imageUrl', () => {
      return request(app.getHttpServer())
        .post('/api/v1/certification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: CertificationType.ID_CARD,
          imageUrl: '',
        })
        .expect(400);
    });
  });

  describe('/api/v1/certification/list (GET)', () => {
    it('should get all certifications for current user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/certification/list')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          res.body.forEach((cert) => {
            expect(cert).toHaveProperty('id');
            expect(cert).toHaveProperty('userId', userId);
            expect(cert).toHaveProperty('type');
            expect(cert).toHaveProperty('status');
            expect(cert).toHaveProperty('imageUrl');
          });
        });
    });

    it('should filter certifications by pending status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/certification/list')
        .query({ status: CertificationStatus.PENDING })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((cert) => {
            expect(cert.status).toBe(CertificationStatus.PENDING);
          });
        });
    });

    it('should filter certifications by approved status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/certification/list')
        .query({ status: CertificationStatus.APPROVED })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter certifications by rejected status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/certification/list')
        .query({ status: CertificationStatus.REJECTED })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/certification/list')
        .expect(401);
    });

    it('should return certifications ordered by creation date descending', () => {
      return request(app.getHttpServer())
        .get('/api/v1/certification/list')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          if (res.body.length > 1) {
            const dates = res.body.map((cert) => new Date(cert.createdAt).getTime());
            for (let i = 0; i < dates.length - 1; i++) {
              expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
            }
          }
        });
    });
  });

  describe('Certification types', () => {
    const certificationTypes = [
      { type: CertificationType.HOUSE, name: '房产' },
      { type: CertificationType.EDUCATION, name: '学历' },
      { type: CertificationType.ID_CARD, name: '身份证' },
      { type: CertificationType.BUSINESS, name: '营业执照' },
      { type: CertificationType.DRIVER, name: '驾驶证' },
      { type: CertificationType.UTILITY, name: '水电表' },
    ];

    certificationTypes.forEach(({ type, name }) => {
      it(`should support ${name} certification type`, () => {
        return request(app.getHttpServer())
          .post('/api/v1/certification')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            type,
            imageUrl: `https://example.com/${type}.jpg`,
            description: `${name}认证测试`,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.type).toBe(type);
          });
      });
    });
  });

  describe('Multiple certifications workflow', () => {
    it('should allow user to submit multiple certifications', async () => {
      const cert1 = await request(app.getHttpServer())
        .post('/api/v1/certification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: CertificationType.DRIVER,
          imageUrl: 'https://example.com/driver1.jpg',
        })
        .expect(201);

      const cert2 = await request(app.getHttpServer())
        .post('/api/v1/certification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: CertificationType.UTILITY,
          imageUrl: 'https://example.com/utility1.jpg',
        })
        .expect(201);

      expect(cert1.body.id).not.toBe(cert2.body.id);
      expect(cert1.body.type).toBe(CertificationType.DRIVER);
      expect(cert2.body.type).toBe(CertificationType.UTILITY);

      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/certification/list')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listResponse.body.length).toBeGreaterThanOrEqual(2);
    });
  });
});
