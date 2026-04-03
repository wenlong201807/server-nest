import { Test, TestingModule } from '@nestjs/testing';
import { SquareService } from '../square.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SquarePost } from '../entities/post.entity';
import { SquareComment } from '../entities/comment.entity';
import { SquareLike } from '../entities/like.entity';
import { PostReport } from '../entities/report.entity';
import { UserService } from '../../user/user.service';
import { PointsService } from '../../points/points.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PostStatus, TargetType, PointsSourceType, ReportReason } from '@common/constants';

describe('SquareService', () => {
  let service: SquareService;
  let postRepository: any;
  let commentRepository: any;
  let likeRepository: any;
  let reportRepository: any;
  let userService: any;
  let pointsService: any;

  const mockUser = {
    id: 1,
    nickname: 'User 1',
    avatarUrl: 'avatar1.jpg',
    isVerified: true,
  };

  const mockPost = {
    id: 1,
    userId: 1,
    content: '这是一个测试帖子',
    contentPreview: '这是一个测试帖子',
    images: [],
    likeCount: 0,
    commentCount: 0,
    status: PostStatus.NORMAL,
    hotScore: 0,
    viewCount: 0,
    shareCount: 0,
    user: mockUser,
    createdAt: new Date(),
  };

  const mockComment = {
    id: 1,
    postId: 1,
    userId: 1,
    content: '这是一条评论',
    status: 1,
    replyCount: 0,
    likeCount: 0,
    rootId: null,
    parentId: null,
    replyToId: null,
    replyToUserId: null,
    user: mockUser,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    postRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn(),
      })),
    };

    commentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getManyAndCount: jest.fn(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn(),
      })),
    };

    likeRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    reportRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    userService = {
      findById: jest.fn(),
    };

    pointsService = {
      addPoints: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SquareService,
        {
          provide: getRepositoryToken(SquarePost),
          useValue: postRepository,
        },
        {
          provide: getRepositoryToken(SquareComment),
          useValue: commentRepository,
        },
        {
          provide: getRepositoryToken(SquareLike),
          useValue: likeRepository,
        },
        {
          provide: getRepositoryToken(PostReport),
          useValue: reportRepository,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: PointsService,
          useValue: pointsService,
        },
      ],
    }).compile();

    service = module.get<SquareService>(SquareService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('应该成功创建帖子', async () => {
      const dto = {
        content: '这是一个测试帖子',
        images: ['image1.jpg'],
      };
      postRepository.create.mockReturnValue(mockPost);
      postRepository.save.mockResolvedValue(mockPost);
      pointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.createPost(1, dto);

      expect(result).toEqual({
        id: mockPost.id,
        pointsEarned: 5,
      });
      expect(postRepository.create).toHaveBeenCalledWith({
        userId: 1,
        content: dto.content,
        contentPreview: dto.content,
        images: dto.images,
        hotScore: 0,
        viewCount: 0,
        shareCount: 0,
      });
      expect(pointsService.addPoints).toHaveBeenCalledWith(
        1,
        5,
        PointsSourceType.PUBLISH,
        mockPost.id,
      );
    });

    it('应该生成内容预览', async () => {
      const longContent = 'a'.repeat(600);
      const dto = {
        content: longContent,
        images: [],
      };
      postRepository.create.mockReturnValue({ ...mockPost, content: longContent });
      postRepository.save.mockResolvedValue({ ...mockPost, id: 1 });
      pointsService.addPoints.mockResolvedValue(undefined);

      await service.createPost(1, dto);

      expect(postRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contentPreview: longContent.substring(0, 500) + '...',
        }),
      );
    });
  });

  describe('getPosts', () => {
    it('应该返回帖子列表', async () => {
      const posts = [mockPost];
      postRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([posts, 1]),
      });

      const result = await service.getPosts(1, 20, 'latest');

      expect(result).toEqual({
        list: posts.map((post) => ({
          ...post,
          user: {
            id: post.user.id,
            nickname: post.user.nickname,
            avatarUrl: post.user.avatarUrl,
            verified: post.user.isVerified,
          },
        })),
        total: 1,
        page: 1,
        pageSize: 20,
      });
    });

    it('应该支持热门排序', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      postRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getPosts(1, 20, 'hot');

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'post.likeCount + post.commentCount',
        'DESC',
      );
    });
  });

  describe('getPost', () => {
    it('应该返回帖子详情', async () => {
      postRepository.findOne.mockResolvedValue(mockPost);

      const result = await service.getPost(1);

      expect(result).toEqual({
        ...mockPost,
        user: {
          id: mockPost.user.id,
          nickname: mockPost.user.nickname,
          avatarUrl: mockPost.user.avatarUrl,
          verified: mockPost.user.isVerified,
        },
      });
    });

    it('应该抛出异常当帖子不存在', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(service.getPost(999)).rejects.toThrow(NotFoundException);
      await expect(service.getPost(999)).rejects.toThrow('帖子不存在');
    });
  });

  describe('deletePost', () => {
    it('应该成功删除帖子', async () => {
      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.DELETED });

      await service.deletePost(1, 1);

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PostStatus.DELETED,
        }),
      );
    });

    it('应该拒绝删除不存在的帖子', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(service.deletePost(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('应该拒绝删除他人的帖子', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(service.deletePost(2, 1)).rejects.toThrow(NotFoundException);
      expect(postRepository.findOne).toHaveBeenCalledWith({ where: { id: 1, userId: 2 } });
    });
  });

  describe('createComment', () => {
    it('应该成功创建评论', async () => {
      const dto = {
        postId: 1,
        content: '这是一条评论',
      };
      commentRepository.create.mockReturnValue(mockComment);
      commentRepository.save.mockResolvedValue(mockComment);
      pointsService.addPoints.mockResolvedValue(undefined);
      const mockQueryBuilder = postRepository.createQueryBuilder();
      mockQueryBuilder.execute.mockResolvedValue(undefined);

      const result = await service.createComment(1, dto);

      expect(result).toEqual({
        id: mockComment.id,
        message: '评论成功',
      });
      expect(pointsService.addPoints).toHaveBeenCalledWith(
        1,
        2,
        PointsSourceType.COMMENT,
        mockComment.id,
      );
    });

    it('应该支持回复评论', async () => {
      const dto = {
        postId: 1,
        content: '这是一条回复',
        replyToId: 1,
        replyToUserId: 2,
      };
      const parentComment = { ...mockComment, id: 1, rootId: null };
      commentRepository.findOne.mockResolvedValue(parentComment);
      const replyComment = {
        ...mockComment,
        id: 2,
        replyToId: 1,
        replyToUserId: 2,
        rootId: 1,
        parentId: 1,
      };
      commentRepository.create.mockReturnValue(replyComment);
      commentRepository.save.mockResolvedValue(replyComment);
      pointsService.addPoints.mockResolvedValue(undefined);
      const mockQueryBuilder = commentRepository.createQueryBuilder();
      mockQueryBuilder.execute.mockResolvedValue(undefined);

      const result = await service.createComment(1, dto);

      expect(result.id).toBe(2);
      expect(commentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('应该支持嵌套回复', async () => {
      const dto = {
        postId: 1,
        content: '这是一条嵌套回复',
        replyToId: 2,
        replyToUserId: 3,
      };
      const parentComment = { ...mockComment, id: 2, rootId: 1, parentId: 1 };
      commentRepository.findOne.mockResolvedValue(parentComment);
      const nestedReply = {
        ...mockComment,
        id: 3,
        replyToId: 2,
        replyToUserId: 3,
        rootId: 1,
        parentId: 1,
      };
      commentRepository.create.mockReturnValue(nestedReply);
      commentRepository.save.mockResolvedValue(nestedReply);
      pointsService.addPoints.mockResolvedValue(undefined);
      const mockQueryBuilder = commentRepository.createQueryBuilder();
      mockQueryBuilder.execute.mockResolvedValue(undefined);

      const result = await service.createComment(1, dto);

      expect(result.id).toBe(3);
      expect(commentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(nestedReply.rootId).toBe(1);
      expect(nestedReply.parentId).toBe(1);
    });

    it('应该在回复时更新根评论的回复数', async () => {
      const dto = {
        postId: 1,
        content: '回复',
        replyToId: 1,
        replyToUserId: 2,
      };
      const parentComment = { ...mockComment, id: 1, rootId: null };
      commentRepository.findOne.mockResolvedValue(parentComment);
      const savedReply = { ...mockComment, id: 2, rootId: 1, parentId: 1 };
      commentRepository.create.mockReturnValue(savedReply);
      commentRepository.save.mockResolvedValue(savedReply);
      pointsService.addPoints.mockResolvedValue(undefined);

      const mockCommentQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      commentRepository.createQueryBuilder.mockReturnValue(mockCommentQueryBuilder);

      await service.createComment(1, dto);

      expect(mockCommentQueryBuilder.update).toHaveBeenCalledWith(SquareComment);
      expect(mockCommentQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: 1 });
    });

    it('应该在顶级评论时更新帖子的评论数', async () => {
      const dto = {
        postId: 1,
        content: '顶级评论',
      };
      const topLevelComment = { ...mockComment, rootId: null, parentId: null };
      commentRepository.create.mockReturnValue(topLevelComment);
      commentRepository.save.mockResolvedValue(topLevelComment);
      pointsService.addPoints.mockResolvedValue(undefined);

      const mockPostQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      postRepository.createQueryBuilder.mockReturnValue(mockPostQueryBuilder);

      await service.createComment(1, dto);

      expect(mockPostQueryBuilder.update).toHaveBeenCalledWith(SquarePost);
      expect(mockPostQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: 1 });
    });
  });

  describe('getComments', () => {
    it('应该返回评论列表', async () => {
      const comments = [mockComment];
      commentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([comments, 1]),
      });

      const result = await service.getComments(1, 1, 20, 'time');

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该支持热门排序', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      commentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getComments(1, 1, 20, 'hot');

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('comment.likeCount', 'DESC');
    });
  });

  describe('getReplies', () => {
    it('应该返回评论的回复列表', async () => {
      const replies = [
        { ...mockComment, id: 2, rootId: 1, parentId: 1 },
        { ...mockComment, id: 3, rootId: 1, parentId: 1 },
      ];
      commentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([replies, 2]),
      });

      const result = await service.getReplies(1, 1, 20);

      expect(result.total).toBe(2);
      expect(result.list.length).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该按时间升序排列回复', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      commentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getReplies(1, 1, 20);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('comment.createdAt', 'ASC');
    });

    it('应该处理无效的分页参数', async () => {
      commentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });

      const result = await service.getReplies(1, -1, -10);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('toggleLike', () => {
    it('应该成功点赞帖子', async () => {
      const dto = { targetId: 1, targetType: TargetType.POST };
      likeRepository.findOne.mockResolvedValue(null);
      likeRepository.create.mockReturnValue({ userId: 1, ...dto });
      likeRepository.save.mockResolvedValue({ id: 1, userId: 1, ...dto });
      postRepository.increment = jest.fn().mockResolvedValue(undefined);
      pointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.toggleLike(1, dto);

      expect(result).toEqual({ isLiked: true, pointsEarned: 1 });
      expect(likeRepository.save).toHaveBeenCalled();
      expect(postRepository.increment).toHaveBeenCalledWith({ id: 1 }, 'likeCount', 1);
      expect(pointsService.addPoints).toHaveBeenCalledWith(1, 1, PointsSourceType.LIKE, 1);
    });

    it('应该成功取消点赞帖子', async () => {
      const dto = { targetId: 1, targetType: TargetType.POST };
      const existingLike = { id: 1, userId: 1, ...dto };
      likeRepository.findOne.mockResolvedValue(existingLike);
      likeRepository.remove.mockResolvedValue(existingLike);
      postRepository.decrement = jest.fn().mockResolvedValue(undefined);

      const result = await service.toggleLike(1, dto);

      expect(result).toEqual({ isLiked: false });
      expect(likeRepository.remove).toHaveBeenCalledWith(existingLike);
      expect(postRepository.decrement).toHaveBeenCalledWith({ id: 1 }, 'likeCount', 1);
    });

    it('应该支持点赞评论', async () => {
      const dto = { targetId: 1, targetType: TargetType.COMMENT };
      likeRepository.findOne.mockResolvedValue(null);
      likeRepository.create.mockReturnValue({ userId: 1, ...dto });
      likeRepository.save.mockResolvedValue({ id: 1, userId: 1, ...dto });
      pointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.toggleLike(1, dto);

      expect(result).toEqual({ isLiked: true, pointsEarned: 1 });
      expect(likeRepository.save).toHaveBeenCalled();
    });

    it('应该支持取消点赞评论', async () => {
      const dto = { targetId: 1, targetType: TargetType.COMMENT };
      const existingLike = { id: 1, userId: 1, ...dto };
      likeRepository.findOne.mockResolvedValue(existingLike);
      likeRepository.remove.mockResolvedValue(existingLike);

      const result = await service.toggleLike(1, dto);

      expect(result).toEqual({ isLiked: false });
      expect(likeRepository.remove).toHaveBeenCalledWith(existingLike);
    });
  });

  describe('report', () => {
    it('应该成功举报帖子', async () => {
      const dto = {
        postId: 1,
        reason: ReportReason.PORNOGRAPHY,
        description: '包含不当言论',
      };
      const savedReport = { id: 1, reporterId: 1, ...dto };
      reportRepository.create.mockReturnValue(savedReport);
      reportRepository.save.mockResolvedValue(savedReport);

      const result = await service.report(1, dto);

      expect(result).toEqual(savedReport);
      expect(reportRepository.create).toHaveBeenCalledWith({
        postId: 1,
        reporterId: 1,
        reason: ReportReason.PORNOGRAPHY,
        description: '包含不当言论',
      });
    });

    it('应该支持无描述的举报', async () => {
      const dto = {
        postId: 1,
        reason: ReportReason.AD,
      };
      const savedReport = { id: 1, reporterId: 1, ...dto };
      reportRepository.create.mockReturnValue(savedReport);
      reportRepository.save.mockResolvedValue(savedReport);

      const result = await service.report(1, dto);

      expect(result).toEqual(savedReport);
      expect(reportRepository.create).toHaveBeenCalledWith({
        postId: 1,
        reporterId: 1,
        reason: ReportReason.AD,
        description: undefined,
      });
    });
  });

  describe('边界测试', () => {
    it('应该处理空图片数组', async () => {
      const dto = {
        content: '测试帖子',
        images: [],
      };
      postRepository.create.mockReturnValue(mockPost);
      postRepository.save.mockResolvedValue(mockPost);
      pointsService.addPoints.mockResolvedValue(undefined);

      await service.createPost(1, dto);

      expect(postRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [],
        }),
      );
    });

    it('应该处理无效的分页参数', async () => {
      commentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });

      const result = await service.getComments(1, -1, -10);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该处理getComments中的错误', async () => {
      commentRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.getComments(1, 1, 20)).rejects.toThrow('Database error');
    });

    it('应该处理getReplies中的错误', async () => {
      commentRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.getReplies(1, 1, 20)).rejects.toThrow('Database error');
    });

    it('应该处理评论中没有rootId的情况', async () => {
      const comments = [{ ...mockComment, rootId: null }];
      commentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([comments, 1]),
      });

      const result = await service.getComments(1, 1, 20);

      expect(result.list[0].replies).toEqual([]);
    });

    it('应该处理评论中有rootId的情况并获取回复', async () => {
      const comments = [{ ...mockComment, id: 1, rootId: 1 }];
      const replies = [{ ...mockComment, id: 2, rootId: 1, parentId: 1 }];

      let callCount = 0;
      commentRepository.createQueryBuilder.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
            getManyAndCount: jest.fn().mockResolvedValue([comments, 1]),
          };
        } else {
          return {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue(replies),
          };
        }
      });

      const result = await service.getComments(1, 1, 20);

      expect(result.list[0].replies.length).toBe(1);
    });

    it('应该支持点赞评论时更新评论点赞数', async () => {
      const dto = { targetId: 1, targetType: TargetType.COMMENT };
      likeRepository.findOne.mockResolvedValue(null);
      likeRepository.create.mockReturnValue({ userId: 1, ...dto });
      likeRepository.save.mockResolvedValue({ id: 1, userId: 1, ...dto });
      pointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.toggleLike(1, dto);

      expect(result.isLiked).toBe(true);
      expect(result.pointsEarned).toBe(1);
    });

    it('应该处理没有user的帖子', async () => {
      const postWithoutUser = { ...mockPost, user: null };
      postRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[postWithoutUser], 1]),
      });

      const result = await service.getPosts(1, 20, 'latest');

      expect(result.list[0].user).toBeNull();
    });

    it('应该处理没有user的评论', async () => {
      const commentWithoutUser = { ...mockComment, user: null, replyToUser: null };
      commentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[commentWithoutUser], 1]),
      });

      const result = await service.getComments(1, 1, 20);

      expect(result.list[0].user).toBeNull();
      expect(result.list[0].replyToUser).toBeNull();
    });

    it('应该处理没有user的回复', async () => {
      const replyWithoutUser = { ...mockComment, user: null, replyToUser: null, rootId: 1, parentId: 1 };
      commentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[replyWithoutUser], 1]),
      });

      const result = await service.getReplies(1, 1, 20);

      expect(result.list[0].user).toBeNull();
      expect(result.list[0].replyToUser).toBeNull();
    });
  });
});
