import { Test, TestingModule } from '@nestjs/testing';
import { SquareController } from '../square.controller';
import { SquareService } from '../square.service';

describe('SquareController', () => {
  let controller: SquareController;
  let squareService: any;

  beforeEach(async () => {
    squareService = {
      createPost: jest.fn(),
      getPosts: jest.fn(),
      getPost: jest.fn(),
      deletePost: jest.fn(),
      createComment: jest.fn(),
      getComments: jest.fn(),
      getReplies: jest.fn(),
      toggleLike: jest.fn(),
      report: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SquareController],
      providers: [
        {
          provide: SquareService,
          useValue: squareService,
        },
      ],
    }).compile();

    controller = module.get<SquareController>(SquareController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('应该调用 squareService.createPost', async () => {
      const userId = 1;
      const dto = {
        content: '测试帖子内容',
        images: ['image1.jpg', 'image2.jpg'],
      };
      const mockResult = {
        id: 1,
        content: '测试帖子内容',
        userId: 1,
      };
      squareService.createPost.mockResolvedValue(mockResult);

      const result = await controller.createPost(userId, dto);

      expect(result).toEqual(mockResult);
      expect(squareService.createPost).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('getPosts', () => {
    it('应该调用 squareService.getPosts 使用默认参数', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
      squareService.getPosts.mockResolvedValue(mockResult);

      const result = await controller.getPosts();

      expect(result).toEqual(mockResult);
      expect(squareService.getPosts).toHaveBeenCalledWith(1, 20, 'latest');
    });

    it('应该调用 squareService.getPosts 使用自定义参数', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 2,
        pageSize: 10,
      };
      squareService.getPosts.mockResolvedValue(mockResult);

      const result = await controller.getPosts('2', '10', 'hot');

      expect(result).toEqual(mockResult);
      expect(squareService.getPosts).toHaveBeenCalledWith(2, 10, 'hot');
    });

    it('应该处理无效的分页参数', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
      squareService.getPosts.mockResolvedValue(mockResult);

      const result = await controller.getPosts('invalid', 'invalid', 'latest');

      expect(result).toEqual(mockResult);
      expect(squareService.getPosts).toHaveBeenCalledWith(1, 20, 'latest');
    });
  });

  describe('getPost', () => {
    it('应该调用 squareService.getPost', async () => {
      const postId = '123';
      const mockResult = {
        id: 123,
        content: '帖子详情',
        userId: 1,
      };
      squareService.getPost.mockResolvedValue(mockResult);

      const result = await controller.getPost(postId);

      expect(result).toEqual(mockResult);
      expect(squareService.getPost).toHaveBeenCalledWith(123);
    });
  });

  describe('deletePost', () => {
    it('应该调用 squareService.deletePost', async () => {
      const userId = 1;
      const postId = '123';
      const mockResult = { message: '删除成功' };
      squareService.deletePost.mockResolvedValue(mockResult);

      const result = await controller.deletePost(userId, postId);

      expect(result).toEqual(mockResult);
      expect(squareService.deletePost).toHaveBeenCalledWith(userId, 123);
    });
  });

  describe('createComment', () => {
    it('应该调用 squareService.createComment', async () => {
      const userId = 1;
      const dto = {
        postId: 123,
        content: '评论内容',
      };
      const mockResult = {
        id: 1,
        postId: 123,
        content: '评论内容',
        userId: 1,
      };
      squareService.createComment.mockResolvedValue(mockResult);

      const result = await controller.createComment(userId, dto);

      expect(result).toEqual(mockResult);
      expect(squareService.createComment).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('getComments', () => {
    it('应该调用 squareService.getComments 使用默认参数', async () => {
      const postId = '123';
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
      squareService.getComments.mockResolvedValue(mockResult);

      const result = await controller.getComments(postId);

      expect(result).toEqual(mockResult);
      expect(squareService.getComments).toHaveBeenCalledWith(123, 1, 20, 'time');
    });

    it('应该调用 squareService.getComments 使用自定义参数', async () => {
      const postId = '123';
      const mockResult = {
        data: [],
        total: 0,
        page: 2,
        pageSize: 10,
      };
      squareService.getComments.mockResolvedValue(mockResult);

      const result = await controller.getComments(postId, '2', '10', 'hot');

      expect(result).toEqual(mockResult);
      expect(squareService.getComments).toHaveBeenCalledWith(123, 2, 10, 'hot');
    });
  });

  describe('getReplies', () => {
    it('应该调用 squareService.getReplies 使用默认参数', async () => {
      const commentId = '456';
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 5,
      };
      squareService.getReplies.mockResolvedValue(mockResult);

      const result = await controller.getReplies(commentId);

      expect(result).toEqual(mockResult);
      expect(squareService.getReplies).toHaveBeenCalledWith(456, 1, 5);
    });

    it('应该调用 squareService.getReplies 使用自定义参数', async () => {
      const commentId = '456';
      const mockResult = {
        data: [],
        total: 0,
        page: 2,
        pageSize: 10,
      };
      squareService.getReplies.mockResolvedValue(mockResult);

      const result = await controller.getReplies(commentId, '2', '10');

      expect(result).toEqual(mockResult);
      expect(squareService.getReplies).toHaveBeenCalledWith(456, 2, 10);
    });

    it('应该处理无效的分页参数', async () => {
      const commentId = '456';
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 5,
      };
      squareService.getReplies.mockResolvedValue(mockResult);

      const result = await controller.getReplies(commentId, 'invalid', 'invalid');

      expect(result).toEqual(mockResult);
      expect(squareService.getReplies).toHaveBeenCalledWith(456, 1, 5);
    });
  });

  describe('toggleLike', () => {
    it('应该调用 squareService.toggleLike', async () => {
      const userId = 1;
      const dto = {
        targetId: 123,
        targetType: 1, // TargetType.POST
      };
      const mockResult = { liked: true };
      squareService.toggleLike.mockResolvedValue(mockResult);

      const result = await controller.toggleLike(userId, dto);

      expect(result).toEqual(mockResult);
      expect(squareService.toggleLike).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('report', () => {
    it('应该调用 squareService.report', async () => {
      const userId = 1;
      const dto = {
        postId: 123,
        reason: 1, // ReportReason.PORNOGRAPHY
        description: '违规内容',
      };
      const mockResult = { message: '举报成功' };
      squareService.report.mockResolvedValue(mockResult);

      const result = await controller.report(userId, dto);

      expect(result).toEqual(mockResult);
      expect(squareService.report).toHaveBeenCalledWith(userId, dto);
    });
  });
});
