import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Friend API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let userId: number;
  let targetUserId: number;
  let targetAuthToken: string;

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

    // Register and login test user
    const testUser = {
      mobile: '13900000010',
      password: 'Test123456',
      nickname: 'E2E好友测试用户',
      gender: 1,
      inviteCode: 'E2EFRIEND01',
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

    authToken = loginRes.body.access_token;

    // Register target user
    const targetUser = {
      mobile: '13900000011',
      password: 'Test123456',
      nickname: 'E2E目标用户',
      gender: 2,
      inviteCode: 'E2EFRIEND02',
    };

    const targetRegisterRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(targetUser);

    targetUserId = targetRegisterRes.body.id;

    const targetLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        mobile: targetUser.mobile,
        password: targetUser.password,
      });

    targetAuthToken = targetLoginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/friend/follow (POST)', () => {
    it('should follow a user successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/friend/follow')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUserId })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('userId', userId);
          expect(res.body).toHaveProperty('friendId', targetUserId);
          expect(res.body).toHaveProperty('status', 0); // FOLLOWING
        });
    });

    it('should fail when trying to follow self', () => {
      return request(app.getHttpServer())
        .post('/api/v1/friend/follow')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId })
        .expect(400);
    });

    it('should fail when following already followed user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/friend/follow')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUserId })
        .expect(400);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/friend/follow')
        .send({ userId: targetUserId })
        .expect(401);
    });
  });

  describe('/api/v1/friend/following (GET)', () => {
    it('should get following list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/friend/following')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('user');
          expect(res.body[0].user).toHaveProperty('id', targetUserId);
          expect(res.body[0].user).toHaveProperty('nickname');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/friend/following')
        .expect(401);
    });
  });

  describe('/api/v1/friend/list (GET)', () => {
    it('should get friend list (empty initially)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/friend/list')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Initially empty as we only followed, not became friends
        });
    });
  });

  describe('/api/v1/friend/status/:userId (GET)', () => {
    it('should get friendship status', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/friend/status/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('isFollowing', true);
          expect(res.body).toHaveProperty('isFriend', false);
          expect(res.body).toHaveProperty('canChat');
          expect(res.body).toHaveProperty('chatCount');
          expect(res.body).toHaveProperty('requiredPoints', 50);
          expect(res.body).toHaveProperty('currentPoints');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/friend/status/${targetUserId}`)
        .expect(401);
    });
  });

  describe('/api/v1/friend/unlock-chat (POST)', () => {
    it('should fail when chat count is insufficient', () => {
      return request(app.getHttpServer())
        .post('/api/v1/friend/unlock-chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: targetUserId })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('需要先互发8条消息');
        });
    });

    it('should fail when not following', async () => {
      // Register another user
      const anotherUser = {
        mobile: '13900000012',
        password: 'Test123456',
        nickname: 'E2E另一个用户',
        gender: 1,
        inviteCode: 'E2EFRIEND03',
      };

      const anotherRegisterRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(anotherUser);

      const anotherUserId = anotherRegisterRes.body.id;

      return request(app.getHttpServer())
        .post('/api/v1/friend/unlock-chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: anotherUserId })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('请先关注对方');
        });
    });
  });

  describe('/api/v1/friend/block (POST)', () => {
    it('should block a user successfully', async () => {
      // Register a user to block
      const blockUser = {
        mobile: '13900000013',
        password: 'Test123456',
        nickname: 'E2E被拉黑用户',
        gender: 1,
        inviteCode: 'E2EFRIEND04',
      };

      const blockRegisterRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(blockUser);

      const blockUserId = blockRegisterRes.body.id;

      return request(app.getHttpServer())
        .post('/api/v1/friend/block')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: blockUserId, reason: '骚扰' })
        .expect(201);
    });

    it('should fail when blocking already blocked user', async () => {
      const blockUser = {
        mobile: '13900000013',
        password: 'Test123456',
      };

      const blockLoginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(blockUser);

      const blockUserId = blockLoginRes.body.user.id;

      return request(app.getHttpServer())
        .post('/api/v1/friend/block')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: blockUserId })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('已在黑名单中');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/friend/block')
        .send({ userId: targetUserId })
        .expect(401);
    });
  });

  describe('/api/v1/friend/blocklist (GET)', () => {
    it('should get blocklist', () => {
      return request(app.getHttpServer())
        .get('/api/v1/friend/blocklist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('user');
          expect(res.body[0].user).toHaveProperty('id');
          expect(res.body[0].user).toHaveProperty('nickname');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/friend/blocklist')
        .expect(401);
    });
  });

  describe('/api/v1/friend/:userId (DELETE)', () => {
    it('should delete friend successfully', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/friend/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should fail when deleting non-existent friend', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/friend/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('好友不存在');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/friend/${targetUserId}`)
        .expect(401);
    });
  });

  describe('Complete friend workflow', () => {
    it('should complete full workflow: follow -> chat -> unlock -> become friends', async () => {
      // Register two new users for clean workflow test
      const user1 = {
        mobile: '13900000020',
        password: 'Test123456',
        nickname: 'E2E工作流用户1',
        gender: 1,
        inviteCode: 'E2EWORK01',
      };

      const user2 = {
        mobile: '13900000021',
        password: 'Test123456',
        nickname: 'E2E工作流用户2',
        gender: 2,
        inviteCode: 'E2EWORK02',
      };

      // Register users
      const user1Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(user1);

      const user2Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(user2);

      // Login users
      const user1Login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ mobile: user1.mobile, password: user1.password });

      const user2Login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ mobile: user2.mobile, password: user2.password });

      const user1Token = user1Login.body.access_token;
      const user2Token = user2Login.body.access_token;
      const user1Id = user1Res.body.id;
      const user2Id = user2Res.body.id;

      // Step 1: User1 follows User2
      await request(app.getHttpServer())
        .post('/api/v1/friend/follow')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ userId: user2Id })
        .expect(201);

      // Step 2: User2 follows User1
      await request(app.getHttpServer())
        .post('/api/v1/friend/follow')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ userId: user1Id })
        .expect(201);

      // Step 3: Check status - should be following but not friends
      const statusRes = await request(app.getHttpServer())
        .get(`/api/v1/friend/status/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(statusRes.body.isFollowing).toBe(true);
      expect(statusRes.body.isFriend).toBe(false);
      expect(statusRes.body.canChat).toBe(false);

      // Step 4: Check following list
      const followingRes = await request(app.getHttpServer())
        .get('/api/v1/friend/following')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(followingRes.body.length).toBeGreaterThan(0);
      const followedUser = followingRes.body.find((f: any) => f.user.id === user2Id);
      expect(followedUser).toBeDefined();

      // Step 5: Simulate 8 chat messages by directly updating chat count
      await dataSource.query(
        'UPDATE friendships SET chatCount = 8 WHERE userId = ? AND friendId = ?',
        [user1Id, user2Id],
      );
      await dataSource.query(
        'UPDATE friendships SET chatCount = 8 WHERE userId = ? AND friendId = ?',
        [user2Id, user1Id],
      );

      // Step 6: Give user1 enough points (50 points required)
      await dataSource.query(
        'UPDATE users SET points = 100 WHERE id = ?',
        [user1Id],
      );

      // Step 7: Check status after chat - should be able to unlock
      const statusAfterChat = await request(app.getHttpServer())
        .get(`/api/v1/friend/status/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(statusAfterChat.body.chatCount).toBe(8);
      expect(statusAfterChat.body.canChat).toBe(true);
      expect(statusAfterChat.body.currentPoints).toBeGreaterThanOrEqual(50);

      // Step 8: Unlock chat (become friends)
      const unlockRes = await request(app.getHttpServer())
        .post('/api/v1/friend/unlock-chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ userId: user2Id })
        .expect(201);

      expect(unlockRes.body.unlocked).toBe(true);
      expect(unlockRes.body.pointsConsumed).toBe(50);

      // Step 9: Verify friendship status
      const finalStatus = await request(app.getHttpServer())
        .get(`/api/v1/friend/status/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(finalStatus.body.isFriend).toBe(true);
      expect(finalStatus.body.canChat).toBe(true);

      // Step 10: Verify points were deducted
      const userAfterUnlock = await dataSource.query(
        'SELECT points FROM users WHERE id = ?',
        [user1Id],
      );
      expect(userAfterUnlock[0].points).toBe(50); // 100 - 50 = 50

      // Step 11: Check friend list
      const friendListRes = await request(app.getHttpServer())
        .get('/api/v1/friend/list')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(friendListRes.body.length).toBeGreaterThan(0);
      const friend = friendListRes.body.find((f: any) => f.user.id === user2Id);
      expect(friend).toBeDefined();
      expect(friend.status).toBe(1); // FRIEND status
    });

    it('should fail unlock when insufficient points', async () => {
      // Register two new users
      const user1 = {
        mobile: '13900000030',
        password: 'Test123456',
        nickname: 'E2E积分测试用户1',
        gender: 1,
        inviteCode: 'E2EPOINTS01',
      };

      const user2 = {
        mobile: '13900000031',
        password: 'Test123456',
        nickname: 'E2E积分测试用户2',
        gender: 2,
        inviteCode: 'E2EPOINTS02',
      };

      const user1Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(user1);

      const user2Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(user2);

      const user1Login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ mobile: user1.mobile, password: user1.password });

      const user1Token = user1Login.body.access_token;
      const user1Id = user1Res.body.id;
      const user2Id = user2Res.body.id;

      // Follow each other
      await request(app.getHttpServer())
        .post('/api/v1/friend/follow')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ userId: user2Id })
        .expect(201);

      // Simulate 8 chat messages
      await dataSource.query(
        'UPDATE friendships SET chatCount = 8 WHERE userId = ? AND friendId = ?',
        [user1Id, user2Id],
      );

      // Set points to less than required (e.g., 30 points)
      await dataSource.query(
        'UPDATE users SET points = 30 WHERE id = ?',
        [user1Id],
      );

      // Try to unlock - should fail
      await request(app.getHttpServer())
        .post('/api/v1/friend/unlock-chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ userId: user2Id })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('积分不足');
        });
    });
  });

  describe('Data cleanup', () => {
    it('should clean up test data', async () => {
      // Clean up friendships
      await dataSource.query('DELETE FROM friendships WHERE userId >= 13900000000');
      await dataSource.query('DELETE FROM user_blacklist WHERE userId >= 13900000000');

      // Clean up users (this will cascade delete related data)
      await dataSource.query('DELETE FROM users WHERE mobile LIKE "139000000%"');
    });
  });
});
