import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestDataService } from '../test-data.service';
import { User } from '../../user/entities/user.entity';
import { SquarePost } from '../../square/entities/post.entity';
import { SquareComment } from '../../square/entities/comment.entity';
import { SquareLike } from '../../square/entities/like.entity';
import { Certification } from '../../certification/entities/certification.entity';
import { PointsLog } from '../../points/entities/points-log.entity';
import { PostReport } from '../../square/entities/report.entity';
import { Friendship } from '../../friend/entities/friendship.entity';
import { ChatMessage } from '../../chat/entities/message.entity';
import { PasswordUtil } from '../../../common/utils/password.util';
import { PointsType, PointsSourceType, CertificationStatus, CertificationType, FriendStatus } from '@common/constants';

jest.mock('../../../common/utils/password.util');

describe('TestDataService', () => {
  let service: TestDataService;
  let userRepository: jest.Mocked<Repository<User>>;
  let postRepository: jest.Mocked<Repository<SquarePost>>;
  let commentRepository: jest.Mocked<Repository<SquareComment>>;
  let likeRepository: jest.Mocked<Repository<SquareLike>>;
  let certificationRepository: jest.Mocked<Repository<Certification>>;
  let pointsLogRepository: jest.Mocked<Repository<PointsLog>>;
  let reportRepository: jest.Mocked<Repository<PostReport>>;
  let friendshipRepository: jest.Mocked<Repository<Friendship>>;
  let messageRepository: jest.Mocked<Repository<ChatMessage>>;

  const mockRepository = () => ({
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestDataService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(SquarePost),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(SquareComment),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(SquareLike),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Certification),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(PointsLog),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(PostReport),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Friendship),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<TestDataService>(TestDataService);
    userRepository = module.get(getRepositoryToken(User));
    postRepository = module.get(getRepositoryToken(SquarePost));
    commentRepository = module.get(getRepositoryToken(SquareComment));
    likeRepository = module.get(getRepositoryToken(SquareLike));
    certificationRepository = module.get(getRepositoryToken(Certification));
    pointsLogRepository = module.get(getRepositoryToken(PointsLog));
    reportRepository = module.get(getRepositoryToken(PostReport));
    friendshipRepository = module.get(getRepositoryToken(Friendship));
    messageRepository = module.get(getRepositoryToken(ChatMessage));

    // Mock PasswordUtil.hash
    (PasswordUtil.hash as jest.Mock).mockResolvedValue('hashed_password');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should skip test data creation if users already exist', async () => {
      userRepository.count.mockResolvedValue(5);
      const createTestDataSpy = jest.spyOn(service, 'createTestData');

      await service.onModuleInit();

      expect(userRepository.count).toHaveBeenCalled();
      expect(createTestDataSpy).not.toHaveBeenCalled();
    });

    it('should create test data if no users exist', async () => {
      userRepository.count.mockResolvedValue(0);
      const createTestDataSpy = jest.spyOn(service, 'createTestData').mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(userRepository.count).toHaveBeenCalled();
      expect(createTestDataSpy).toHaveBeenCalled();
    });
  });

  describe('createTestData', () => {
    it('should create all test data in correct order', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001', nickname: '用户A', points: 5000 },
        { id: 2, mobile: '13800000002', nickname: '用户B', points: 3000 },
        { id: 3, mobile: '13800000003', nickname: '用户C', points: 1000 },
      ] as User[];

      userRepository.create.mockImplementation((data: any) => data as User);
      userRepository.save.mockImplementation((user: any) => Promise.resolve({ ...user, id: mockUsers.length }));
      postRepository.create.mockImplementation((data: any) => data as SquarePost);
      postRepository.save.mockResolvedValue({} as SquarePost);
      postRepository.find.mockResolvedValue([
        { id: 1, userId: 1, content: 'Test post 1' },
        { id: 2, userId: 2, content: 'Test post 2' },
      ] as SquarePost[]);
      commentRepository.create.mockImplementation((data: any) => data as SquareComment);
      commentRepository.save.mockImplementation((comment: any) => Promise.resolve({ ...comment, id: 1 }));
      commentRepository.find.mockResolvedValue([
        { id: 1, postId: 1, userId: 1, content: 'Test comment' },
      ] as SquareComment[]);
      commentRepository.update.mockResolvedValue({} as any);
      likeRepository.create.mockImplementation((data: any) => data as SquareLike);
      likeRepository.save.mockResolvedValue({} as SquareLike);
      friendshipRepository.save.mockResolvedValue({} as Friendship);
      messageRepository.create.mockImplementation((data: any) => data as ChatMessage);
      messageRepository.save.mockResolvedValue({} as ChatMessage);
      certificationRepository.create.mockImplementation((data: any) => data as Certification);
      certificationRepository.save.mockResolvedValue({} as Certification);
      pointsLogRepository.save.mockResolvedValue({} as PointsLog);
      reportRepository.save.mockResolvedValue({} as PostReport);

      await service.createTestData();

      expect(userRepository.save).toHaveBeenCalled();
      expect(postRepository.save).toHaveBeenCalled();
      expect(commentRepository.save).toHaveBeenCalled();
      expect(likeRepository.save).toHaveBeenCalled();
      expect(friendshipRepository.save).toHaveBeenCalled();
      expect(messageRepository.save).toHaveBeenCalled();
      expect(certificationRepository.save).toHaveBeenCalled();
      expect(pointsLogRepository.save).toHaveBeenCalled();
      expect(reportRepository.save).toHaveBeenCalled();
    });
  });

  describe('createUsers', () => {
    it('should create 3 test users with correct data', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001', nickname: '用户A', points: 5000, inviteCode: 'ABC12345' },
        { id: 2, mobile: '13800000002', nickname: '用户B', points: 3000, inviteCode: 'DEF67890' },
        { id: 3, mobile: '13800000003', nickname: '用户C', points: 1000, inviteCode: 'GHI11111' },
      ];

      userRepository.create.mockImplementation((data: any) => data as User);
      userRepository.save.mockImplementation((user: any) => {
        const idx = mockUsers.findIndex(u => u.mobile === user.mobile);
        return Promise.resolve({ ...user, id: mockUsers[idx].id } as User);
      });

      const users = await service['createUsers']();

      expect(users).toHaveLength(3);
      expect(userRepository.create).toHaveBeenCalledTimes(3);
      expect(userRepository.save).toHaveBeenCalledTimes(3);
      expect(PasswordUtil.hash).toHaveBeenCalledWith('test123456');
      expect(PasswordUtil.hash).toHaveBeenCalledTimes(3);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mobile: '13800000001',
          nickname: '用户A',
          points: 5000,
          gender: 1,
          status: 0,
        }),
      );
    });

    it('should hash passwords for all users', async () => {
      userRepository.create.mockImplementation((data: any) => data as User);
      userRepository.save.mockImplementation((user: any) => Promise.resolve({ ...user, id: 1 } as User));

      await service['createUsers']();

      expect(PasswordUtil.hash).toHaveBeenCalledTimes(3);
      expect(PasswordUtil.hash).toHaveBeenCalledWith('test123456');
    });
  });

  describe('createPosts', () => {
    it('should create 4 test posts', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001', nickname: '用户A' },
        { id: 2, mobile: '13800000002', nickname: '用户B' },
        { id: 3, mobile: '13800000003', nickname: '用户C' },
      ] as User[];

      postRepository.create.mockImplementation((data: any) => data as SquarePost);
      postRepository.save.mockResolvedValue({} as SquarePost);

      await service['createPosts'](mockUsers);

      expect(postRepository.create).toHaveBeenCalledTimes(4);
      expect(postRepository.save).toHaveBeenCalledTimes(4);
      expect(postRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          content: '这是一个测试帖子1',
          images: [],
          status: 0,
        }),
      );
    });
  });

  describe('createComments', () => {
    it('should create comments and replies', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001', nickname: '用户A' },
        { id: 2, mobile: '13800000002', nickname: '用户B' },
        { id: 3, mobile: '13800000003', nickname: '用户C' },
      ] as User[];

      const mockPosts = [
        { id: 1, userId: 1, content: 'Test post 1' },
        { id: 2, userId: 2, content: 'Test post 2' },
      ] as SquarePost[];

      postRepository.find.mockResolvedValue(mockPosts);
      commentRepository.create.mockImplementation((data: any) => data as SquareComment);
      commentRepository.save.mockImplementation((comment: any) =>
        Promise.resolve({ ...comment, id: Math.floor(Math.random() * 1000) } as SquareComment)
      );
      commentRepository.update.mockResolvedValue({} as any);
      postRepository.update.mockResolvedValue({} as any);

      await service['createComments'](mockUsers);

      expect(postRepository.find).toHaveBeenCalledWith({ take: 2 });
      expect(commentRepository.create).toHaveBeenCalled();
      expect(commentRepository.save).toHaveBeenCalled();
      expect(commentRepository.update).toHaveBeenCalled();
      expect(postRepository.update).toHaveBeenCalledWith(1, { commentCount: 6 });
    });

    it('should skip if no posts exist', async () => {
      const mockUsers = [{ id: 1 }] as User[];
      postRepository.find.mockResolvedValue([]);

      await service['createComments'](mockUsers);

      expect(commentRepository.create).not.toHaveBeenCalled();
    });

    it('should set replyToUserId to null when replyToId is null (line 213 branch)', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001', nickname: '用户A' },
        { id: 2, mobile: '13800000002', nickname: '用户B' },
        { id: 3, mobile: '13800000003', nickname: '用户C' },
      ] as User[];

      const mockPosts = [
        { id: 1, userId: 1, content: 'Test post 1' },
      ] as SquarePost[];

      postRepository.find.mockResolvedValue(mockPosts);
      commentRepository.create.mockImplementation((data: any) => data as SquareComment);
      commentRepository.save.mockImplementation((comment: any) =>
        Promise.resolve({ ...comment, id: 1 } as SquareComment)
      );
      commentRepository.update.mockResolvedValue({} as any);
      postRepository.update.mockResolvedValue({} as any);

      await service['createComments'](mockUsers);

      expect(commentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          replyToId: null,
          replyToUserId: null,
        }),
      );
    });

    it('should set replyToUserId to users[0].id when replyToId exists (line 213 branch)', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001', nickname: '用户A' },
        { id: 2, mobile: '13800000002', nickname: '用户B' },
        { id: 3, mobile: '13800000003', nickname: '用户C' },
      ] as User[];

      const mockPosts = [
        { id: 1, userId: 1, content: 'Test post 1' },
      ] as SquarePost[];

      postRepository.find.mockResolvedValue(mockPosts);

      let callCount = 0;
      commentRepository.create.mockImplementation((data: any) => data as SquareComment);
      commentRepository.save.mockImplementation((comment: any) => {
        callCount++;
        return Promise.resolve({ ...comment, id: callCount } as SquareComment);
      });
      commentRepository.update.mockResolvedValue({} as any);
      postRepository.update.mockResolvedValue({} as any);

      await service['createComments'](mockUsers);

      const replyCalls = (commentRepository.create as jest.Mock).mock.calls.filter(
        call => call[0].replyToId !== null
      );
      expect(replyCalls.length).toBeGreaterThan(0);
      expect(replyCalls[0][0]).toMatchObject({
        replyToUserId: 2,
      });
    });

    it('should handle empty savedComments array (line 223 branch)', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001', nickname: '用户A' },
        { id: 2, mobile: '13800000002', nickname: '用户B' },
        { id: 3, mobile: '13800000003', nickname: '用户C' },
      ] as User[];

      const mockPosts = [
        { id: 1, userId: 1, content: 'Test post 1' },
      ] as SquarePost[];

      postRepository.find.mockResolvedValue(mockPosts);
      commentRepository.create.mockImplementation((data: any) => data as SquareComment);
      commentRepository.save.mockResolvedValue({ id: 1 } as any);
      commentRepository.update.mockResolvedValue({} as any);
      postRepository.update.mockResolvedValue({} as any);

      await service['createComments'](mockUsers);

      expect(commentRepository.save).toHaveBeenCalled();
      expect(postRepository.update).toHaveBeenCalledWith(1, { commentCount: 6 });
    });

    it('should test all branches including line 213 ternary operator', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001', nickname: '用户A' },
        { id: 2, mobile: '13800000002', nickname: '用户B' },
        { id: 3, mobile: '13800000003', nickname: '用户C' },
      ] as User[];

      const mockPosts = [
        { id: 1, userId: 1, content: 'Test post 1' },
      ] as SquarePost[];

      postRepository.find.mockResolvedValue(mockPosts);
      commentRepository.create.mockImplementation((data: any) => data as SquareComment);

      let callCount = 0;
      commentRepository.save.mockImplementation((comment: any) => {
        callCount++;
        return Promise.resolve({ ...comment, id: callCount } as SquareComment);
      });

      commentRepository.update.mockResolvedValue({} as any);
      postRepository.update.mockResolvedValue({} as any);

      await service['createComments'](mockUsers);

      const createCalls = (commentRepository.create as jest.Mock).mock.calls;

      // Verify both branches of line 213: c.replyToId ? users[0].id : null
      const commentsWithNullReplyToId = createCalls.filter(call => call[0].replyToId === null);
      const commentsWithReplyToId = createCalls.filter(call => call[0].replyToId !== null);

      expect(commentsWithNullReplyToId.length).toBeGreaterThan(0);
      expect(commentsWithReplyToId.length).toBeGreaterThan(0);

      // Verify null branch
      commentsWithNullReplyToId.forEach(call => {
        expect(call[0].replyToUserId).toBeNull();
      });

      // Verify truthy branch
      commentsWithReplyToId.forEach(call => {
        expect(call[0].replyToUserId).toBe(2);
      });
    });
  });

  describe('createLikes', () => {
    it('should create likes for posts and comments', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001' },
        { id: 2, mobile: '13800000002' },
        { id: 3, mobile: '13800000003' },
      ] as User[];

      const mockPosts = [
        { id: 1, userId: 1 },
        { id: 2, userId: 2 },
      ] as SquarePost[];

      const mockComments = [
        { id: 1, postId: 1, userId: 1 },
        { id: 2, postId: 1, userId: 2 },
        { id: 3, postId: 1, userId: 3 },
      ] as SquareComment[];

      postRepository.find.mockResolvedValue(mockPosts);
      commentRepository.find.mockResolvedValue(mockComments);
      likeRepository.create.mockImplementation((data: any) => data as SquareLike);
      likeRepository.save.mockResolvedValue({} as SquareLike);
      postRepository.update.mockResolvedValue({} as any);

      await service['createLikes'](mockUsers);

      expect(likeRepository.create).toHaveBeenCalledTimes(4);
      expect(likeRepository.save).toHaveBeenCalledTimes(4);
      expect(postRepository.update).toHaveBeenCalledWith(1, { likeCount: 2 });
      expect(postRepository.update).toHaveBeenCalledWith(2, { likeCount: 1 });
    });
  });

  describe('createFriendships', () => {
    it('should create friendship relationships', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001' },
        { id: 2, mobile: '13800000002' },
        { id: 3, mobile: '13800000003' },
      ] as User[];

      friendshipRepository.save.mockResolvedValue({} as Friendship);

      await service['createFriendships'](mockUsers);

      expect(friendshipRepository.save).toHaveBeenCalledTimes(6);
      expect(friendshipRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          friendId: 2,
          status: FriendStatus.FOLLOWING,
        }),
      );
      expect(friendshipRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          friendId: 2,
          status: FriendStatus.FRIEND,
        }),
      );
    });
  });

  describe('createChatMessages', () => {
    it('should create chat messages between users', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001' },
        { id: 2, mobile: '13800000002' },
        { id: 3, mobile: '13800000003' },
      ] as User[];

      messageRepository.create.mockImplementation((data: any) => data as ChatMessage);
      messageRepository.save.mockResolvedValue({} as ChatMessage);

      await service['createChatMessages'](mockUsers);

      expect(messageRepository.create).toHaveBeenCalledTimes(6);
      expect(messageRepository.save).toHaveBeenCalledTimes(6);
      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          senderId: 1,
          receiverId: 2,
          content: '你好，很高兴认识你！',
          msgType: 1,
          isRead: false,
        }),
      );
    });
  });

  describe('createCertifications', () => {
    it('should create certifications with different statuses', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001' },
        { id: 2, mobile: '13800000002' },
        { id: 3, mobile: '13800000003' },
      ] as User[];

      certificationRepository.create.mockImplementation((data: any) => data as Certification);
      certificationRepository.save.mockResolvedValue({} as Certification);

      await service['createCertifications'](mockUsers);

      expect(certificationRepository.create).toHaveBeenCalledTimes(3);
      expect(certificationRepository.save).toHaveBeenCalledTimes(3);
      expect(certificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: CertificationType.HOUSE,
          status: CertificationStatus.PENDING,
        }),
      );
      expect(certificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 2,
          type: CertificationType.EDUCATION,
          status: CertificationStatus.APPROVED,
        }),
      );
      expect(certificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 3,
          type: CertificationType.ID_CARD,
          status: CertificationStatus.REJECTED,
        }),
      );
    });
  });

  describe('createPointsLogs', () => {
    it('should create points logs for each user', async () => {
      const mockUsers = [
        { id: 1, points: 5000 },
        { id: 2, points: 3000 },
        { id: 3, points: 1000 },
      ] as User[];

      pointsLogRepository.save.mockResolvedValue({} as PointsLog);

      await service['createPointsLogs'](mockUsers);

      expect(pointsLogRepository.save).toHaveBeenCalledTimes(6); // 2 logs per user
      expect(pointsLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: PointsType.EARN,
          source: PointsSourceType.REGISTER,
          amount: 2000,
          remark: '注册赠送',
        }),
      );
      expect(pointsLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: PointsType.EARN,
          source: PointsSourceType.SIGN,
          amount: 10,
          remark: '每日签到',
        }),
      );
    });
  });

  describe('createReports', () => {
    it('should create post reports', async () => {
      const mockUsers = [
        { id: 1, mobile: '13800000001' },
        { id: 2, mobile: '13800000002' },
        { id: 3, mobile: '13800000003' },
      ] as User[];

      const mockPosts = [
        { id: 1, userId: 1 },
        { id: 2, userId: 2 },
      ] as SquarePost[];

      postRepository.find.mockResolvedValue(mockPosts);
      reportRepository.save.mockResolvedValue({} as PostReport);

      await service['createReports'](mockUsers);

      expect(postRepository.find).toHaveBeenCalledWith({ take: 2 });
      expect(reportRepository.save).toHaveBeenCalledTimes(2);
      expect(reportRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterId: 2,
          postId: 1,
          reason: 1,
          description: '内容涉嫌色情',
          status: 0,
        }),
      );
    });

    it('should skip reports if postId is undefined (line 183 branch)', async () => {
      const mockUsers = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ] as User[];

      postRepository.find.mockResolvedValue([{ id: 1 }] as SquarePost[]);
      reportRepository.save.mockResolvedValue({} as PostReport);

      await service['createReports'](mockUsers);

      expect(reportRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should handle posts[1]?.id when posts[1] is undefined (line 179 optional chaining)', async () => {
      const mockUsers = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ] as User[];

      postRepository.find.mockResolvedValue([{ id: 1 }] as SquarePost[]);
      reportRepository.save.mockResolvedValue({} as PostReport);

      await service['createReports'](mockUsers);

      expect(reportRepository.save).toHaveBeenCalledTimes(1);
      expect(reportRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterId: 2,
          postId: 1,
        }),
      );
    });
  });
});
