import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { MsgType } from '../../src/common/constants';

describe('Chat API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let user1Token: string;
  let user2Token: string;
  let user1Id: number;
  let user2Id: number;

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

    // Register and login user 1
    const testUser1 = {
      mobile: '13900000030',
      password: 'Test123456',
      nickname: 'E2E聊天用户1',
      gender: 1,
      inviteCode: 'E2ECHAT01',
    };

    const user1RegisterRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser1);

    user1Id = user1RegisterRes.body.id;

    const user1LoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        mobile: testUser1.mobile,
        password: testUser1.password,
      });

    user1Token = user1LoginRes.body.access_token;

    // Register and login user 2
    const testUser2 = {
      mobile: '13900000031',
      password: 'Test123456',
      nickname: 'E2E聊天用户2',
      gender: 2,
      inviteCode: 'E2ECHAT02',
    };

    const user2RegisterRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser2);

    user2Id = user2RegisterRes.body.id;

    const user2LoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        mobile: testUser2.mobile,
        password: testUser2.password,
      });

    user2Token = user2LoginRes.body.access_token;

    // Make them friends by following each other
    await request(app.getHttpServer())
      .post('/api/v1/friend/follow')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ userId: user2Id });

    await request(app.getHttpServer())
      .post('/api/v1/friend/follow')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ userId: user1Id });

    // Simulate chat count to unlock chat
    const friendRepo = dataSource.getRepository('friendships');
    await friendRepo.update(
      { userId: user1Id, friendId: user2Id },
      { chatCount: 8 },
    );
    await friendRepo.update(
      { userId: user2Id, friendId: user1Id },
      { chatCount: 8 },
    );

    // Unlock chat for both users
    await request(app.getHttpServer())
      .post('/api/v1/friend/unlock-chat')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ userId: user2Id });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/chat/send (POST)', () => {
    it('should send a text message successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: '你好，这是一条测试消息',
          msgType: MsgType.TEXT,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('createdAt');
        });
    });

    it('should send an image message successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: 'https://example.com/image.jpg',
          msgType: MsgType.IMAGE,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('createdAt');
        });
    });

    it('should fail when sending to non-friend', async () => {
      // Register a third user
      const user3 = {
        mobile: '13900000032',
        password: 'Test123456',
        nickname: 'E2E聊天用户3',
        gender: 1,
        inviteCode: 'E2ECHAT03',
      };

      const user3Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(user3);

      const user3Id = user3Res.body.id;

      return request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user3Id,
          content: '你好',
          msgType: MsgType.TEXT,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('请先解锁私聊');
        });
    });

    it('should fail with empty content', () => {
      return request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: '',
          msgType: MsgType.TEXT,
        })
        .expect(400);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .send({
          receiverId: user2Id,
          content: '你好',
          msgType: MsgType.TEXT,
        })
        .expect(401);
    });

    it('should fail with invalid receiverId', () => {
      return request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: 'invalid',
          content: '你好',
          msgType: MsgType.TEXT,
        })
        .expect(400);
    });
  });

  describe('/api/v1/chat/history/:userId (GET)', () => {
    beforeAll(async () => {
      // Send some messages for history
      await request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: '历史消息1',
          msgType: MsgType.TEXT,
        });

      await request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          receiverId: user1Id,
          content: '历史消息2',
          msgType: MsgType.TEXT,
        });

      await request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: '历史消息3',
          msgType: MsgType.TEXT,
        });
    });

    it('should get chat history successfully', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/chat/history/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('pageSize');
          expect(res.body).toHaveProperty('hasMore');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0]).toHaveProperty('id');
          expect(res.body.data[0]).toHaveProperty('content');
          expect(res.body.data[0]).toHaveProperty('isSelf');
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/chat/history/${user2Id}?page=1&pageSize=2`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.pageSize).toBe(2);
        });
    });

    it('should support cursor-based pagination with beforeId', async () => {
      const historyRes = await request(app.getHttpServer())
        .get(`/api/v1/chat/history/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const firstMessageId = historyRes.body.data[0].id;

      return request(app.getHttpServer())
        .get(`/api/v1/chat/history/${user2Id}?beforeId=${firstMessageId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.every((msg: any) => msg.id < firstMessageId)).toBe(true);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/chat/history/${user2Id}`)
        .expect(401);
    });
  });

  describe('/api/v1/chat/conversations (GET)', () => {
    it('should get conversations list successfully', () => {
      return request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('userId');
          expect(res.body[0]).toHaveProperty('nickname');
          expect(res.body[0]).toHaveProperty('avatarUrl');
          expect(res.body[0]).toHaveProperty('lastMessage');
          expect(res.body[0]).toHaveProperty('lastTime');
          expect(res.body[0]).toHaveProperty('unreadCount');
        });
    });

    it('should return conversations ordered by last message time', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      if (res.body.length > 1) {
        const times = res.body.map((conv: any) => new Date(conv.lastTime).getTime());
        for (let i = 0; i < times.length - 1; i++) {
          expect(times[i]).toBeGreaterThanOrEqual(times[i + 1]);
        }
      }
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .expect(401);
    });
  });

  describe('/api/v1/chat/read/:userId (PUT)', () => {
    beforeAll(async () => {
      // Send unread messages
      await request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          receiverId: user1Id,
          content: '未读消息1',
          msgType: MsgType.TEXT,
        });

      await request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          receiverId: user1Id,
          content: '未读消息2',
          msgType: MsgType.TEXT,
        });
    });

    it('should mark messages as read successfully', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/chat/read/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
    });

    it('should reduce unread count after marking as read', async () => {
      // Get conversations before marking as read
      const beforeRes = await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const conversationBefore = beforeRes.body.find((c: any) => c.userId === user2Id);
      const unreadCountBefore = conversationBefore?.unreadCount || 0;

      // Send a new message
      await request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          receiverId: user1Id,
          content: '新的未读消息',
          msgType: MsgType.TEXT,
        });

      // Mark as read
      await request(app.getHttpServer())
        .put(`/api/v1/chat/read/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Get conversations after marking as read
      const afterRes = await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const conversationAfter = afterRes.body.find((c: any) => c.userId === user2Id);
      expect(conversationAfter.unreadCount).toBe(0);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/chat/read/${user2Id}`)
        .expect(401);
    });
  });

  describe('Complete chat workflow', () => {
    it('should complete full chat workflow: send -> get history -> mark as read', async () => {
      // Register two new users for clean workflow test
      const workflowUser1 = {
        mobile: '13900000040',
        password: 'Test123456',
        nickname: 'E2E聊天工作流用户1',
        gender: 1,
        inviteCode: 'E2ECHATW01',
      };

      const workflowUser2 = {
        mobile: '13900000041',
        password: 'Test123456',
        nickname: 'E2E聊天工作流用户2',
        gender: 2,
        inviteCode: 'E2ECHATW02',
      };

      // Register users
      const wUser1Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(workflowUser1);

      const wUser2Res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(workflowUser2);

      // Login users
      const wUser1Login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ mobile: workflowUser1.mobile, password: workflowUser1.password });

      const wUser2Login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ mobile: workflowUser2.mobile, password: workflowUser2.password });

      const wUser1Token = wUser1Login.body.access_token;
      const wUser2Token = wUser2Login.body.access_token;
      const wUser1Id = wUser1Res.body.id;
      const wUser2Id = wUser2Res.body.id;

      // Make them friends
      await request(app.getHttpServer())
        .post('/api/v1/friend/follow')
        .set('Authorization', `Bearer ${wUser1Token}`)
        .send({ userId: wUser2Id });

      await request(app.getHttpServer())
        .post('/api/v1/friend/follow')
        .set('Authorization', `Bearer ${wUser2Token}`)
        .send({ userId: wUser1Id });

      // Update chat count and unlock
      const friendRepo = dataSource.getRepository('friendships');
      await friendRepo.update(
        { userId: wUser1Id, friendId: wUser2Id },
        { chatCount: 8 },
      );
      await friendRepo.update(
        { userId: wUser2Id, friendId: wUser1Id },
        { chatCount: 8 },
      );

      await request(app.getHttpServer())
        .post('/api/v1/friend/unlock-chat')
        .set('Authorization', `Bearer ${wUser1Token}`)
        .send({ userId: wUser2Id });

      // Step 1: Send messages
      const sendRes1 = await request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${wUser1Token}`)
        .send({
          receiverId: wUser2Id,
          content: '工作流测试消息1',
          msgType: MsgType.TEXT,
        })
        .expect(201);

      expect(sendRes1.body).toHaveProperty('id');

      await request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${wUser2Token}`)
        .send({
          receiverId: wUser1Id,
          content: '工作流测试消息2',
          msgType: MsgType.TEXT,
        })
        .expect(201);

      // Step 2: Get history
      const historyRes = await request(app.getHttpServer())
        .get(`/api/v1/chat/history/${wUser2Id}`)
        .set('Authorization', `Bearer ${wUser1Token}`)
        .expect(200);

      expect(historyRes.body.data.length).toBeGreaterThanOrEqual(2);
      expect(historyRes.body.data.some((msg: any) => msg.content === '工作流测试消息1')).toBe(true);
      expect(historyRes.body.data.some((msg: any) => msg.content === '工作流测试消息2')).toBe(true);

      // Step 3: Get conversations
      const conversationsRes = await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${wUser1Token}`)
        .expect(200);

      const conversation = conversationsRes.body.find((c: any) => c.userId === wUser2Id);
      expect(conversation).toBeDefined();
      expect(conversation.unreadCount).toBeGreaterThan(0);

      // Step 4: Mark as read
      await request(app.getHttpServer())
        .put(`/api/v1/chat/read/${wUser2Id}`)
        .set('Authorization', `Bearer ${wUser1Token}`)
        .expect(200);

      // Step 5: Verify unread count is 0
      const conversationsAfterRead = await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${wUser1Token}`)
        .expect(200);

      const conversationAfterRead = conversationsAfterRead.body.find((c: any) => c.userId === wUser2Id);
      expect(conversationAfterRead.unreadCount).toBe(0);
    });
  });

  describe('Message validation', () => {
    it('should validate message content length', () => {
      const longContent = 'a'.repeat(10000);
      return request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: longContent,
          msgType: MsgType.TEXT,
        })
        .expect(201);
    });

    it('should handle special characters in message content', () => {
      return request(app.getHttpServer())
        .post('/api/v1/chat/send')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          receiverId: user2Id,
          content: '特殊字符测试: 😀 🎉 ❤️ @#$%^&*()',
          msgType: MsgType.TEXT,
        })
        .expect(201);
    });
  });
});
