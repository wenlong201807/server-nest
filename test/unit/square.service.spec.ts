import { Test, TestingModule } from '@nestjs/testing';
import { SquareService } from '../../src/modules/square/square.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SquarePost } from '../../src/modules/square/entities/post.entity';
import { SquareComment } from '../../src/modules/square/entities/comment.entity';
import { SquareLike } from '../../src/modules/square/entities/like.entity';
import { PostReport } from '../../src/modules/square/entities/report.entity';
import { UserService } from '../../src/modules/user/user.service';
import { PointsService } from '../../src/modules/points/points.service';
import { NotFoundException } from '@nestjs/common';
import { PostStatus, TargetType, ReportReason } from '../../src/common/constants';

describe('SquareService (Unit)', () => {
  let service: SquareService;
  let postRepository: Repository<SquarePost>;
  let commentRepository: Repository<SquareComment>;
  let likeRepository: Repository<SquareLike>;
  let reportRepository: Repository<PostReport>;
  let userService: UserService;
  let pointsService: PointsService;

  const mockUser = {
    id: 1,
    nickname: '测试用户',
    avatarUrl: 'https://example.com/avatar.jpg',
    isVerified: true,
  };

  const mockPost: SquarePost = {
    id: 1,
    userId: 1,
    content: '测试帖子内容',
    images: ['https://example.com/image1.jpg'],
    likeCount: 10,
    commentCount: 5,
    status: PostStatus.NORMAL,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser as any,
  };

  const mockComment: SquareComment = {
    id: 1,
    postId: 1,
    userId: 1,
    parentId: null,
    replyToId: null,
    replyToUserId: null,
    rootId: null,
    status: 1,
    replyCount: 0,
    content: '测试评论',
    createdAt: new Date(),
    post: mockPost,
    user: mockUser as any,
    parent: null,
    replyTo: null,
    replyToUser: null,
  };

  const mockPostRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
  };

  const mockCommentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockLikeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockReportRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserService = {
    findById: jest.fn(),
  };

  const mockPointsService = {
    addPoints: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SquareService,
        {
          provide: getRepositoryToken(SquarePost),
          useValue: mockPostRepository,
        },
        {
          provide: getRepositoryToken(SquareComment),
          useValue: mockCommentRepository,
        },
        {
          provide: getRepositoryToken(SquareLike),
          useValue: mockLikeRepository,
        },
        {
          provide: getRepositoryToken(PostReport),
          useValue: mockReportRepository,
        },
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
    postRepository = module.get<Repository<SquarePost>>(getRepositoryToken(SquarePost));
    commentRepository = module.get<Repository<SquareComment>>(getRepositoryToken(SquareComment));
    likeRepository = module.get<Repository<SquareLike>>(getRepositoryToken(SquareLike));
    reportRepository = module.get<Repository<PostReport>>(getRepositoryToken(PostReport));
    userService = module.get<UserService>(UserService);
    pointsService = module.get<PointsService>(PointsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const createPostDto = {
        content: '测试帖子内容',
        images: ['https://example.com/image1.jpg'],
      };

      mockPostRepository.create.mockReturnValue(mockPost);
      mockPostRepository.save.mockResolvedValue(mockPost);
      mockPointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.createPost(1, createPostDto);

      expect(result).toEqual({ id: 1, pointsEarned: 5 });
      expect(mockPostRepository.create).toHaveBeenCalledWith({
        userId: 1,
        content: createPostDto.content,
        images: createPostDto.images,
      });
      expect(mockPointsService.addPoints).toHaveBeenCalledWith(1, 5, 'publish', 1);
    });

    it('should create a post without images', async () => {
      const createPostDto = {
        content: '测试帖子内容',
      };

      const postWithoutImages = { ...mockPost, images: [] };
      mockPostRepository.create.mockReturnValue(postWithoutImages);
      mockPostRepository.save.mockResolvedValue(postWithoutImages);
      mockPointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.createPost(1, createPostDto);

      expect(result).toEqual({ id: 1, pointsEarned: 5 });
      expect(mockPostRepository.create).toHaveBeenCalledWith({
        userId: 1,
        content: createPostDto.content,
        images: [],
      });
    });
  });

  describe('getPosts', () => {
    it('should return paginated posts with latest sort', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPost], 1]),
      };

      mockPostRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getPosts(1, 20, 'latest');

      expect(result).toEqual({
        list: [{
          ...mockPost,
          user: {
            id: mockUser.id,
            nickname: mockUser.nickname,
            avatarUrl: mockUser.avatarUrl,
            verified: mockUser.isVerified,
          },
        }],
        total: 1,
        page: 1,
        pageSize: 20,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('post.createdAt', 'DESC');
    });

    it('should return paginated posts with hot sort', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPost], 1]),
      };

      mockPostRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getPosts(1, 20, 'hot');

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('post.likeCount + post.commentCount', 'DESC');
    });
  });

  describe('getPost', () => {
    it('should return a post when found', async () => {
      mockPostRepository.findOne.mockResolvedValue(mockPost);

      const result = await service.getPost(1);

      expect(result).toEqual({
        ...mockPost,
        user: {
          id: mockUser.id,
          nickname: mockUser.nickname,
          avatarUrl: mockUser.avatarUrl,
          verified: mockUser.isVerified,
        },
      });
      expect(mockPostRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPostRepository.findOne.mockResolvedValue(null);

      await expect(service.getPost(999)).rejects.toThrow(NotFoundException);
      await expect(service.getPost(999)).rejects.toThrow('帖子不存在');
    });
  });

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      mockPostRepository.findOne.mockResolvedValue(mockPost);
      mockPostRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.DELETED });

      await service.deletePost(1, 1);

      expect(mockPostRepository.findOne).toHaveBeenCalledWith({ where: { id: 1, userId: 1 } });
      expect(mockPostRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPostRepository.findOne.mockResolvedValue(null);

      await expect(service.deletePost(1, 999)).rejects.toThrow(NotFoundException);
      await expect(service.deletePost(1, 999)).rejects.toThrow('帖子不存在');
    });
  });

  describe('createComment', () => {
    it('should create a top-level comment successfully', async () => {
      const createCommentDto = {
        postId: 1,
        content: '测试评论',
      };

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      mockCommentRepository.create.mockReturnValue(mockComment);
      mockCommentRepository.save.mockResolvedValue(mockComment);
      mockPostRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockPointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.createComment(1, createCommentDto);

      expect(result).toEqual({
        id: 1,
        message: '评论成功',
      });
      expect(mockPointsService.addPoints).toHaveBeenCalledWith(1, 2, 'comment', 1);
    });

    it('should create a reply comment successfully', async () => {
      const createCommentDto = {
        postId: 1,
        content: '回复评论',
        replyToId: 1,
        replyToUserId: 2,
      };

      const replyComment = {
        ...mockComment,
        id: 2,
        replyToId: 1,
        replyToUserId: 2,
        rootId: 1,
        parentId: 1,
      };

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      mockCommentRepository.create.mockReturnValue(replyComment);
      mockCommentRepository.findOne.mockResolvedValue(mockComment);
      mockCommentRepository.save.mockResolvedValue(replyComment);
      mockCommentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockPointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.createComment(1, createCommentDto);

      expect(result).toEqual({
        id: 2,
        message: '评论成功',
      });
    });
  });

  describe('toggleLike', () => {
    it('should like a post when not already liked', async () => {
      const likeDto = {
        targetId: 1,
        targetType: TargetType.POST,
      };

      const mockLike = {
        id: 1,
        userId: 1,
        targetId: 1,
        targetType: TargetType.POST,
        createdAt: new Date(),
      };

      mockLikeRepository.findOne.mockResolvedValue(null);
      mockLikeRepository.create.mockReturnValue(mockLike);
      mockLikeRepository.save.mockResolvedValue(mockLike);
      mockPostRepository.increment.mockResolvedValue(undefined);
      mockPointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.toggleLike(1, likeDto);

      expect(result).toEqual({ isLiked: true, pointsEarned: 1 });
      expect(mockPostRepository.increment).toHaveBeenCalledWith({ id: 1 }, 'likeCount', 1);
      expect(mockPointsService.addPoints).toHaveBeenCalledWith(1, 1, 'like', 1);
    });

    it('should unlike a post when already liked', async () => {
      const likeDto = {
        targetId: 1,
        targetType: TargetType.POST,
      };

      const existingLike = {
        id: 1,
        userId: 1,
        targetId: 1,
        targetType: TargetType.POST,
        createdAt: new Date(),
      };

      mockLikeRepository.findOne.mockResolvedValue(existingLike);
      mockLikeRepository.remove.mockResolvedValue(existingLike);
      mockPostRepository.decrement.mockResolvedValue(undefined);

      const result = await service.toggleLike(1, likeDto);

      expect(result).toEqual({ isLiked: false });
      expect(mockPostRepository.decrement).toHaveBeenCalledWith({ id: 1 }, 'likeCount', 1);
    });
  });

  describe('report', () => {
    it('should create a report successfully', async () => {
      const reportDto = {
        postId: 1,
        reason: ReportReason.PORNOGRAPHY,
        description: '违规内容描述',
      };

      const mockReport = {
        id: 1,
        postId: 1,
        reporterId: 1,
        reason: ReportReason.PORNOGRAPHY,
        description: '违规内容描述',
        status: 0,
        handledAt: null,
        handledBy: null,
        createdAt: new Date(),
        post: mockPost,
        reporter: mockUser as any,
      };

      mockReportRepository.create.mockReturnValue(mockReport);
      mockReportRepository.save.mockResolvedValue(mockReport);

      const result = await service.report(1, reportDto);

      expect(result).toEqual(mockReport);
      expect(mockReportRepository.create).toHaveBeenCalledWith({
        postId: reportDto.postId,
        reporterId: 1,
        reason: reportDto.reason,
        description: reportDto.description,
      });
    });
  });

  describe('getComments', () => {
    it('should return paginated comments', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockComment], 1]),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockCommentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getComments(1, 1, 20, 'time');

      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 20);
    });
  });

  describe('getReplies', () => {
    it('should return paginated replies', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockComment], 1]),
      };

      mockCommentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getReplies(1, 1, 20);

      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 20);
    });
  });
});
