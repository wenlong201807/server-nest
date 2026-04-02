import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { TargetType, ReportReason } from '../../src/common/constants';

describe('Square API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let userId: number;
  let postId: number;
  let commentId: number;

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
      nickname: 'Square测试用户',
      gender: 1,
      inviteCode: 'SQUARE001',
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/square/posts (POST)', () => {
    it('should create a post successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '这是一个测试帖子',
          images: ['https://example.com/image1.jpg'],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('pointsEarned', 5);
          postId = res.body.id;
        });
    });

    it('should create a post without images', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '没有图片的帖子',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('pointsEarned', 5);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/posts')
        .send({
          content: '测试帖子',
        })
        .expect(401);
    });

    it('should fail with empty content', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '',
        })
        .expect(400);
    });
  });

  describe('/api/v1/square/posts (GET)', () => {
    it('should get posts list with default pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/square/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('list');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page', 1);
          expect(res.body).toHaveProperty('pageSize', 20);
          expect(Array.isArray(res.body.list)).toBe(true);
        });
    });

    it('should get posts with custom pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/square/posts?page=1&pageSize=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.pageSize).toBe(10);
        });
    });

    it('should get posts sorted by hot', () => {
      return request(app.getHttpServer())
        .get('/api/v1/square/posts?sort=hot')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('list');
        });
    });

    it('should get posts sorted by latest', () => {
      return request(app.getHttpServer())
        .get('/api/v1/square/posts?sort=latest')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('list');
        });
    });
  });

  describe('/api/v1/square/posts/:id (GET)', () => {
    it('should get a single post by id', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/square/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', postId);
          expect(res.body).toHaveProperty('content');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('nickname');
        });
    });

    it('should return 404 for non-existent post', () => {
      return request(app.getHttpServer())
        .get('/api/v1/square/posts/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/square/comment (POST)', () => {
    it('should create a top-level comment', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/comment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          postId: postId,
          content: '这是一条评论',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('message', '评论成功');
          commentId = res.body.id;
        });
    });

    it('should create a reply comment', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/comment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          postId: postId,
          content: '这是一条回复',
          replyToId: commentId,
          replyToUserId: userId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('message', '评论成功');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/comment')
        .send({
          postId: postId,
          content: '测试评论',
        })
        .expect(401);
    });

    it('should fail with empty content', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/comment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          postId: postId,
          content: '',
        })
        .expect(400);
    });
  });

  describe('/api/v1/square/posts/:id/comments (GET)', () => {
    it('should get comments for a post', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/square/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('list');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page', 1);
          expect(res.body).toHaveProperty('pageSize', 20);
          expect(Array.isArray(res.body.list)).toBe(true);
        });
    });

    it('should get comments with custom pagination', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/square/posts/${postId}/comments?page=1&pageSize=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.pageSize).toBe(10);
        });
    });

    it('should get comments sorted by time', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/square/posts/${postId}/comments?sort=time`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('list');
        });
    });

    it('should get comments sorted by hot', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/square/posts/${postId}/comments?sort=hot`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('list');
        });
    });
  });

  describe('/api/v1/square/comments/:id/replies (GET)', () => {
    it('should get replies for a comment', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/square/comments/${commentId}/replies`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('list');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page', 1);
          expect(res.body).toHaveProperty('pageSize', 5);
          expect(Array.isArray(res.body.list)).toBe(true);
        });
    });

    it('should get replies with custom pagination', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/square/comments/${commentId}/replies?page=1&pageSize=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.pageSize).toBe(10);
        });
    });
  });

  describe('/api/v1/square/like (POST)', () => {
    it('should like a post', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/like')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetId: postId,
          targetType: TargetType.POST,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('isLiked', true);
          expect(res.body).toHaveProperty('pointsEarned', 1);
        });
    });

    it('should unlike a post', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/like')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetId: postId,
          targetType: TargetType.POST,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('isLiked', false);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/like')
        .send({
          targetId: postId,
          targetType: TargetType.POST,
        })
        .expect(401);
    });

    it('should fail with invalid target type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/like')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetId: postId,
          targetType: 999,
        })
        .expect(400);
    });
  });

  describe('/api/v1/square/report (POST)', () => {
    it('should report a post', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          postId: postId,
          reason: ReportReason.PORNOGRAPHY,
          description: '包含不当内容',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('postId', postId);
          expect(res.body).toHaveProperty('reason', ReportReason.PORNOGRAPHY);
        });
    });

    it('should report a post without description', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          postId: postId,
          reason: ReportReason.VIOLENCE,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/report')
        .send({
          postId: postId,
          reason: ReportReason.PORNOGRAPHY,
        })
        .expect(401);
    });

    it('should fail with invalid reason', () => {
      return request(app.getHttpServer())
        .post('/api/v1/square/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          postId: postId,
          reason: 999,
        })
        .expect(400);
    });
  });

  describe('/api/v1/square/posts/:id (DELETE)', () => {
    it('should delete own post', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/square/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '待删除的帖子',
        });

      const deletePostId = createRes.body.id;

      return request(app.getHttpServer())
        .delete(`/api/v1/square/posts/${deletePostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/square/posts/${postId}`)
        .expect(401);
    });

    it('should fail when deleting non-existent post', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/square/posts/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Integration workflow', () => {
    it('should complete a full post lifecycle', async () => {
      // Create a post
      const postRes = await request(app.getHttpServer())
        .post('/api/v1/square/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '完整流程测试帖子',
          images: ['https://example.com/test.jpg'],
        })
        .expect(201);

      const testPostId = postRes.body.id;

      // Get the post
      await request(app.getHttpServer())
        .get(`/api/v1/square/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Like the post
      await request(app.getHttpServer())
        .post('/api/v1/square/like')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetId: testPostId,
          targetType: TargetType.POST,
        })
        .expect(201);

      // Comment on the post
      const commentRes = await request(app.getHttpServer())
        .post('/api/v1/square/comment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          postId: testPostId,
          content: '测试评论',
        })
        .expect(201);

      const testCommentId = commentRes.body.id;

      // Reply to the comment
      await request(app.getHttpServer())
        .post('/api/v1/square/comment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          postId: testPostId,
          content: '测试回复',
          replyToId: testCommentId,
          replyToUserId: userId,
        })
        .expect(201);

      // Get comments
      await request(app.getHttpServer())
        .get(`/api/v1/square/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get replies
      await request(app.getHttpServer())
        .get(`/api/v1/square/comments/${testCommentId}/replies`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Unlike the post
      await request(app.getHttpServer())
        .post('/api/v1/square/like')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetId: testPostId,
          targetType: TargetType.POST,
        })
        .expect(201);

      // Report the post
      await request(app.getHttpServer())
        .post('/api/v1/square/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          postId: testPostId,
          reason: ReportReason.OTHER,
          description: '测试举报',
        })
        .expect(201);

      // Delete the post
      await request(app.getHttpServer())
        .delete(`/api/v1/square/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});
