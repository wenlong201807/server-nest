import { Test, TestingModule } from '@nestjs/testing';
import { PointsService } from '../../src/modules/points/points.service';
import { UserService } from '../../src/modules/user/user.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { PointsConfigService } from '../../src/modules/points-config/points-config.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PointsLog } from '../../src/modules/points/entities/points-log.entity';
import { PointsType, PointsSourceType } from '../../src/common/constants';
import { NotFoundException } from '@nestjs/common';

describe('PointsService (Integration)', () => {
  let service: PointsService;
  let userService: UserService;
  let redisService: RedisService;
  let pointsConfigService: PointsConfigService;

  const mockUser = {
    id: 1,
    mobile: '13800000001',
    nickname: '测试用户',
    points: 2000,
    status: 0,
  };

  const mockPointsLogRepository = {
    create: jest.fn((dto) => dto),
    save: jest.fn((log) => Promise.resolve({ id: 1, ...log })),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getManyAndCount: jest.fn(),
    })),
  };

  const mockUserService = {
    findById: jest.fn(),
    updatePoints: jest.fn(),
  };

  const mockRedisService = {
    exists: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    getJson: jest.fn(),
    setJson: jest.fn(),
    del: jest.fn(),
  };

  const mockPointsConfigService = {
    getValue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        {
          provide: getRepositoryToken(PointsLog),
          useValue: mockPointsLogRepository,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PointsConfigService,
          useValue: mockPointsConfigService,
        },
      ],
    }).compile();

    service = module.get<PointsService>(PointsService);
    userService = module.get<UserService>(UserService);
    redisService = module.get<RedisService>(RedisService);
    pointsConfigService = module.get<PointsConfigService>(PointsConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete sign-in flow', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should complete full sign-in workflow', async () => {
      mockRedisService.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
      mockRedisService.getJson.mockResolvedValue(null);
      mockPointsConfigService.getValue
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(7);
      mockUserService.findById.mockResolvedValue(mockUser);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 2010 });
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.setJson.mockResolvedValue('OK');
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.sign(1);

      expect(result.pointsEarned).toBe(10);
      expect(result.continuousDays).toBe(1);
      expect(result.balance).toBe(2000);

      expect(mockUserService.findById).toHaveBeenCalledWith(1);
      expect(mockUserService.updatePoints).toHaveBeenCalledWith(1, 10);
      expect(mockPointsLogRepository.save).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'sign:1:2024-01-15',
        '1',
        24 * 60 * 60,
      );
    });

    it('should handle continuous sign-in with bonus', async () => {
      mockRedisService.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      mockRedisService.getJson.mockResolvedValue({ continuousDays: 3 });
      mockPointsConfigService.getValue
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(7);
      mockUserService.findById.mockResolvedValue(mockUser);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 2015 });
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.setJson.mockResolvedValue('OK');
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.sign(1);

      expect(result.pointsEarned).toBe(15);
      expect(result.continuousDays).toBe(4);
      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        'sign:last:1',
        { continuousDays: 4 },
        30 * 24 * 60 * 60,
      );
    });

    it('should prevent duplicate sign-in on same day', async () => {
      mockRedisService.exists.mockResolvedValue(true);

      await expect(service.sign(1)).rejects.toThrow(NotFoundException);
      await expect(service.sign(1)).rejects.toThrow('今日已签到');

      expect(mockUserService.updatePoints).not.toHaveBeenCalled();
      expect(mockPointsLogRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Points transaction flow', () => {
    it('should add points and update user balance', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 2050 });
      mockRedisService.del.mockResolvedValue(1);

      await service.addPoints(1, 50, PointsSourceType.PUBLISH, 123, '发布帖子');

      expect(mockPointsLogRepository.create).toHaveBeenCalledWith({
        userId: 1,
        type: PointsType.EARN,
        amount: 50,
        balanceAfter: 2050,
        sourceType: PointsSourceType.PUBLISH,
        sourceId: 123,
        description: '发布帖子',
      });
      expect(mockPointsLogRepository.save).toHaveBeenCalled();
      expect(mockUserService.updatePoints).toHaveBeenCalledWith(1, 50);
      expect(mockRedisService.del).toHaveBeenCalledWith('user:1');
    });

    it('should consume points and create negative log', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 1900 });
      mockRedisService.del.mockResolvedValue(1);

      await service.addPoints(1, -100, PointsSourceType.UNLOCK_CHAT, 456, '解锁私聊');

      expect(mockPointsLogRepository.create).toHaveBeenCalledWith({
        userId: 1,
        type: PointsType.CONSUME,
        amount: -100,
        balanceAfter: 1900,
        sourceType: PointsSourceType.UNLOCK_CHAT,
        sourceId: 456,
        description: '解锁私聊',
      });
      expect(mockUserService.updatePoints).toHaveBeenCalledWith(1, -100);
    });

    it('should use default description when not provided', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 2020 });
      mockRedisService.del.mockResolvedValue(1);

      await service.addPoints(1, 20, PointsSourceType.COMMENT);

      expect(mockPointsLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: '评论',
        }),
      );
    });
  });

  describe('Balance calculation', () => {
    it('should calculate balance with earned and consumed totals', async () => {
      const mockQueryBuilder = mockPointsLogRepository.createQueryBuilder();
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '1500' })
        .mockResolvedValueOnce({ total: '300' });

      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.getBalance(1);

      expect(result).toEqual({
        balance: 2000,
        totalEarned: 1500,
        totalConsumed: 300,
      });
      expect(mockUserService.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('Points logs retrieval', () => {
    it('should retrieve paginated logs', async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 1,
          type: PointsType.EARN,
          amount: 10,
          balanceAfter: 2010,
          sourceType: PointsSourceType.SIGN,
          description: '每日签到',
          createdAt: new Date(),
        },
        {
          id: 2,
          userId: 1,
          type: PointsType.CONSUME,
          amount: -50,
          balanceAfter: 1960,
          sourceType: PointsSourceType.UNLOCK_CHAT,
          description: '解锁私聊',
          createdAt: new Date(),
        },
      ];

      const mockQueryBuilder = mockPointsLogRepository.createQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockLogs, 2]);

      const result = await service.getLogs(1, 1, 20);

      expect(result).toEqual({
        list: mockLogs,
        total: 2,
        page: 1,
        pageSize: 20,
      });
    });

    it('should filter logs by type', async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 1,
          type: PointsType.EARN,
          amount: 10,
          balanceAfter: 2010,
          sourceType: PointsSourceType.SIGN,
          description: '每日签到',
          createdAt: new Date(),
        },
      ];

      const mockQueryBuilder = mockPointsLogRepository.createQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockLogs, 1]);

      await service.getLogs(1, 1, 20, PointsType.EARN);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.type = :type', {
        type: PointsType.EARN,
      });
    });
  });

  describe('Sign status check', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return correct sign status when signed', async () => {
      mockRedisService.exists.mockResolvedValue(true);
      mockRedisService.getJson.mockResolvedValue({ continuousDays: 5 });

      const result = await service.getSignStatus(1);

      expect(result).toEqual({
        signedToday: true,
        continuousDays: 5,
      });
    });

    it('should return correct sign status when not signed', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockRedisService.getJson.mockResolvedValue(null);

      const result = await service.getSignStatus(1);

      expect(result).toEqual({
        signedToday: false,
        continuousDays: 0,
      });
    });
  });
});
