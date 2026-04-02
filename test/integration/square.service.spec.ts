import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SquareService } from '../../src/modules/square/square.service';
import { SquarePost } from '../../src/modules/square/entities/post.entity';
import { SquareComment } from '../../src/modules/square/entities/comment.entity';
import { SquareLike } from '../../src/modules/square/entities/like.entity';
import { PostReport } from '../../src/modules/square/entities/report.entity';
import { UserService } from '../../src/modules/user/user.service';
import { PointsService } from '../../src/modules/points/points.service';
import { DataSource } from 'typeorm';
import { PostStatus, TargetType, ReportReason } from '../../src/common/constants';

describe('SquareService (Integration)', () => {
  let service: SquareService;
  let dataSource: DataSource;
  let userService: UserService;
  let pointsService: PointsService;

  const mockUserService = {
    findById: jest.fn().mockResolvedValue({
      id: 1,
      nickname: '测试用户',
      avatarUrl: 'https://example.com/avatar.jpg',
      isVerified: true,
    }),
  };

  const mockPointsService = {
    addPoints: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [SquarePost, SquareComment, SquareLike, PostReport],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([SquarePost, SquareComment, SquareLike, PostReport]),
      ],
      providers: [
        SquareService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: PointsService,
          useValue: mockPointsService,
        },
      ],
    }).compile();

    service = module.get<SquareService>(SquareService);
    dataSource = module.get<DataSource>(DataSource);
    userService = module.get<UserService>(UserService);
    pointsService = module.get<PointsService>(PointsService);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  afterEach(async () => {
    await dataSource.getRepository(SquareLike).clear();
    await dataSource.getRepository(SquareComment).clear();
    await dataSource.getRepository(SquarePost).clear();
    await dataSource.getRepository(PostReport).clear();
    jest.clearAllMocks();
  });

  describe('createPost and getPosts', () => {
    it('should create a post and retrieve it', async () => {
      const createPostDto = {
        content: '这是一个测试帖子',
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      };

      const result = await service.createPost(1, createPostDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('pointsEarned', 5);
      expect(mockPointsService.addPoints).toHaveBeenCalledWith(1, 5, 'publish', result.id);

      const posts = await service.getPosts(1, 20, 'latest');
      expect(posts.list).toHaveLength(1);
      expect(posts.list[0].content).toBe(createPostDto.content);
      expect(posts.list[0].images).toEqual(createPostDto.images);
    });

    it('should retrieve posts sorted by hot', async () => {
      await service.createPost(1, { content: '帖子1' });
      const post2 = await service.createPost(1, { content: '帖子2' });

      const postRepo = dataSource.getRepository(SquarePost);
      await postRepo.update(post2.id, { likeCount: 10, commentCount: 5 });

      const posts = await service.getPosts(1, 20, 'hot');
      expect(posts.list[0].id).toBe(post2.id);
    });
  });

  describe('getPost', () => {
    it('should retrieve a single post by id', async () => {
      const createPostDto = {
        content: '测试帖子详情',
        images: [],
      };

      const created = await service.createPost(1, createPostDto);
      const post = await service.getPost(created.id);

      expect(post.id).toBe(created.id);
      expect(post.content).toBe(createPostDto.content);
      expect(post.user).toBeDefined();
    });

    it('should throw NotFoundException for non-existent post', async () => {
      await expect(service.getPost(999)).rejects.toThrow('帖子不存在');
    });
  });

  describe('deletePost', () => {
    it('should soft delete a post', async () => {
      const created = await service.createPost(1, { content: '待删除的帖子' });

      await service.deletePost(1, created.id);

      const postRepo = dataSource.getRepository(SquarePost);
      const post = await postRepo.findOne({ where: { id: created.id } });
      expect(post.status).toBe(PostStatus.DELETED);
    });

    it('should throw NotFoundException when deleting non-existent post', async () => {
      await expect(service.deletePost(1, 999)).rejects.toThrow('帖子不存在');
    });

    it('should not allow deleting another user\'s post', async () => {
      const created = await service.createPost(1, { content: '用户1的帖子' });

      await expect(service.deletePost(2, created.id)).rejects.toThrow('帖子不存在');
    });
  });

  describe('createComment and getComments', () => {
    it('should create a top-level comment', async () => {
      const post = await service.createPost(1, { content: '测试帖子' });

      const commentDto = {
        postId: post.id,
        content: '这是一条评论',
      };

      const result = await service.createComment(1, commentDto);

      expect(result).toHaveProperty('id');
      expect(result.message).toBe('评论成功');
      expect(mockPointsService.addPoints).toHaveBeenCalledWith(1, 2, 'comment', result.id);

      const comments = await service.getComments(post.id, 1, 20, 'time');
      expect(comments.list).toHaveLength(1);
      expect(comments.list[0].content).toBe(commentDto.content);
    });

    it('should create a reply comment', async () => {
      const post = await service.createPost(1, { content: '测试帖子' });
      const comment = await service.createComment(1, {
        postId: post.id,
        content: '顶级评论',
      });

      const replyDto = {
        postId: post.id,
        content: '回复评论',
        replyToId: comment.id,
        replyToUserId: 1,
      };

      const reply = await service.createComment(2, replyDto);

      expect(reply).toHaveProperty('id');
      expect(reply.message).toBe('评论成功');

      const commentRepo = dataSource.getRepository(SquareComment);
      const savedReply = await commentRepo.findOne({ where: { id: reply.id } });
      expect(savedReply.replyToId).toBe(comment.id);
      expect(savedReply.rootId).toBe(comment.id);
    });

    it('should update post comment count', async () => {
      const post = await service.createPost(1, { content: '测试帖子' });

      await service.createComment(1, {
        postId: post.id,
        content: '评论1',
      });

      await service.createComment(1, {
        postId: post.id,
        content: '评论2',
      });

      const postRepo = dataSource.getRepository(SquarePost);
      const updatedPost = await postRepo.findOne({ where: { id: post.id } });
      expect(updatedPost.commentCount).toBe(2);
    });
  });

  describe('getReplies', () => {
    it('should retrieve replies for a comment', async () => {
      const post = await service.createPost(1, { content: '测试帖子' });
      const comment = await service.createComment(1, {
        postId: post.id,
        content: '顶级评论',
      });

      await service.createComment(2, {
        postId: post.id,
        content: '回复1',
        replyToId: comment.id,
        replyToUserId: 1,
      });

      await service.createComment(3, {
        postId: post.id,
        content: '回复2',
        replyToId: comment.id,
        replyToUserId: 1,
      });

      const replies = await service.getReplies(comment.id, 1, 20);
      expect(replies.list).toHaveLength(2);
      expect(replies.total).toBe(2);
    });
  });

  describe('toggleLike', () => {
    it('should like a post', async () => {
      const post = await service.createPost(1, { content: '测试帖子' });

      const result = await service.toggleLike(2, {
        targetId: post.id,
        targetType: TargetType.POST,
      });

      expect(result.isLiked).toBe(true);
      expect(result.pointsEarned).toBe(1);
      expect(mockPointsService.addPoints).toHaveBeenCalledWith(2, 1, 'like', post.id);

      const postRepo = dataSource.getRepository(SquarePost);
      const updatedPost = await postRepo.findOne({ where: { id: post.id } });
      expect(updatedPost.likeCount).toBe(1);
    });

    it('should unlike a post', async () => {
      const post = await service.createPost(1, { content: '测试帖子' });

      await service.toggleLike(2, {
        targetId: post.id,
        targetType: TargetType.POST,
      });

      const result = await service.toggleLike(2, {
        targetId: post.id,
        targetType: TargetType.POST,
      });

      expect(result.isLiked).toBe(false);

      const postRepo = dataSource.getRepository(SquarePost);
      const updatedPost = await postRepo.findOne({ where: { id: post.id } });
      expect(updatedPost.likeCount).toBe(0);
    });

    it('should allow multiple users to like the same post', async () => {
      const post = await service.createPost(1, { content: '测试帖子' });

      await service.toggleLike(2, {
        targetId: post.id,
        targetType: TargetType.POST,
      });

      await service.toggleLike(3, {
        targetId: post.id,
        targetType: TargetType.POST,
      });

      const postRepo = dataSource.getRepository(SquarePost);
      const updatedPost = await postRepo.findOne({ where: { id: post.id } });
      expect(updatedPost.likeCount).toBe(2);
    });
  });

  describe('report', () => {
    it('should create a report for a post', async () => {
      const post = await service.createPost(1, { content: '违规帖子' });

      const reportDto = {
        postId: post.id,
        reason: ReportReason.PORNOGRAPHY,
        description: '包含不当内容',
      };

      const result = await service.report(2, reportDto);

      expect(result).toHaveProperty('id');
      expect(result.postId).toBe(post.id);
      expect(result.reporterId).toBe(2);
      expect(result.reason).toBe(ReportReason.PORNOGRAPHY);
      expect(result.description).toBe('包含不当内容');
    });

    it('should allow multiple reports for the same post', async () => {
      const post = await service.createPost(1, { content: '违规帖子' });

      await service.report(2, {
        postId: post.id,
        reason: ReportReason.PORNOGRAPHY,
        description: '举报1',
      });

      await service.report(3, {
        postId: post.id,
        reason: ReportReason.VIOLENCE,
        description: '举报2',
      });

      const reportRepo = dataSource.getRepository(PostReport);
      const reports = await reportRepo.find({ where: { postId: post.id } });
      expect(reports).toHaveLength(2);
    });
  });

  describe('pagination', () => {
    it('should paginate posts correctly', async () => {
      for (let i = 1; i <= 25; i++) {
        await service.createPost(1, { content: `帖子${i}` });
      }

      const page1 = await service.getPosts(1, 20, 'latest');
      expect(page1.list).toHaveLength(20);
      expect(page1.total).toBe(25);
      expect(page1.page).toBe(1);

      const page2 = await service.getPosts(2, 20, 'latest');
      expect(page2.list).toHaveLength(5);
      expect(page2.total).toBe(25);
      expect(page2.page).toBe(2);
    });

    it('should paginate comments correctly', async () => {
      const post = await service.createPost(1, { content: '测试帖子' });

      for (let i = 1; i <= 25; i++) {
        await service.createComment(1, {
          postId: post.id,
          content: `评论${i}`,
        });
      }

      const page1 = await service.getComments(post.id, 1, 20, 'time');
      expect(page1.list).toHaveLength(20);
      expect(page1.total).toBe(25);

      const page2 = await service.getComments(post.id, 2, 20, 'time');
      expect(page2.list).toHaveLength(5);
      expect(page2.total).toBe(25);
    });
  });
});
