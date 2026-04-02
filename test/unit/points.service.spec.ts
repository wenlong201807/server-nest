import { Test, TestingModule } from '@nestjs/testing';
import { PointsService } from '../../src/modules/points/points.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PointsLog } from '../../src/modules/points/entities/points-log.entity';
import { Repository } from 'typeorm';
import { UserService } from '../../src/modules/user/user.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { PointsConfigService } from '../../src/modules/points-config/points-config.service';
import { PointsType, PointsSourceType } from '../../src/common/constants';
import { NotFoundException } from '@nestjs/common';

describe('PointsService (Unit)', () => {
  let service: PointsService;
  let repository: Repository<PointsLog>;
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

  const mockPointsLog = {
    id: 1,
    userId: 1,
    type: PointsType.EARN,
    amount: 10,
    balanceAfter: 2010,
    sourceType: PointsSourceType.SIGN,
    sourceId: 0,
    description: '每日签到',
    createdAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
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
          useValue: mockRepository,
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
    repository = module.get<Repository<PointsLog>>(getRepositoryToken(PointsLog));
    userService = module.get<UserService>(UserService);
    redisService = module.get<RedisService>(RedisService);
    pointsConfigService = module.get<PointsConfigService>(PointsConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return user balance with total earned and consumed', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      };

      mockUserService.findById.mockResolvedValue(mockUser);
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '500' })
        .mockResolvedValueOnce({ total: '100' });

      const result = await service.getBalance(1);

      expect(result).toEqual({
        balance: 2000,
        totalEarned: 500,
        totalConsumed: 100,
      });
      expect(mockUserService.findById).toHaveBeenCalledWith(1);
    });

    it('should handle null totals', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      };

      mockUserService.findById.mockResolvedValue(mockUser);
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: null })
        .mockResolvedValueOnce({ total: null });

      const result = await service.getBalance(1);

      expect(result).toEqual({
        balance: 2000,
        totalEarned: 0,
        totalConsumed: 0,
      });
    });
  });

  describe('addPoints', () => {
    it('should add points and create log entry', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      mockRepository.create.mockReturnValue(mockPointsLog);
      mockRepository.save.mockResolvedValue(mockPointsLog);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 2010 });
      mockRedisService.del.mockResolvedValue(1);

      await service.addPoints(1, 10, PointsSourceType.SIGN, 0, '每日签到');

      expect(mockUserService.findById).toHaveBeenCalledWith(1);
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: 1,
        type: PointsType.EARN,
        amount: 10,
        balanceAfter: 2010,
        sourceType: PointsSourceType.SIGN,
        sourceId: 0,
        description: '每日签到',
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockUserService.updatePoints).toHaveBeenCalledWith(1, 10);
      expect(mockRedisService.del).toHaveBeenCalledWith('user:1');
    });

    it('should handle negative points (consume)', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      mockRepository.create.mockReturnValue({
        ...mockPointsLog,
        type: PointsType.CONSUME,
        amount: -50,
        balanceAfter: 1950,
      });
      mockRepository.save.mockResolvedValue(mockPointsLog);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 1950 });
      mockRedisService.del.mockResolvedValue(1);

      await service.addPoints(1, -50, PointsSourceType.UNLOCK_CHAT, 0, '解锁私聊');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PointsType.CONSUME,
          amount: -50,
        }),
      );
    });

    it('should use default description when not provided', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      mockRepository.create.mockReturnValue(mockPointsLog);
      mockRepository.save.mockResolvedValue(mockPointsLog);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 2010 });
      mockRedisService.del.mockResolvedValue(1);

      await service.addPoints(1, 10, PointsSourceType.SIGN);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: '每日签到',
        }),
      );
    });
  });

  describe('sign', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should sign in successfully on first sign', async () => {
      mockRedisService.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
      mockRedisService.getJson.mockResolvedValue(null);
      mockPointsConfigService.getValue
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(7);
      mockUserService.findById.mockResolvedValue(mockUser);
      mockRepository.create.mockReturnValue(mockPointsLog);
      mockRepository.save.mockResolvedValue(mockPointsLog);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 2010 });
      mockRedisService.del.mockResolvedValue(1);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.setJson.mockResolvedValue('OK');

      const result = await service.sign(1);

      expect(result).toEqual({
        pointsEarned: 10,
        continuousDays: 1,
        balance: 2000,
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'sign:1:2024-01-15',
        '1',
        24 * 60 * 60,
      );
      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        'sign:last:1',
        { continuousDays: 1 },
        30 * 24 * 60 * 60,
      );
    });

    it('should give bonus for continuous sign-in', async () => {
      mockRedisService.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      mockRedisService.getJson.mockResolvedValue({ continuousDays: 2 });
      mockPointsConfigService.getValue
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(7);
      mockUserService.findById.mockResolvedValue(mockUser);
      mockRepository.create.mockReturnValue(mockPointsLog);
      mockRepository.save.mockResolvedValue(mockPointsLog);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 2015 });
      mockRedisService.del.mockResolvedValue(1);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.setJson.mockResolvedValue('OK');

      const result = await service.sign(1);

      expect(result).toEqual({
        pointsEarned: 15,
        continuousDays: 3,
        balance: 2000,
      });
    });

    it('should throw error when already signed today', async () => {
      mockRedisService.exists.mockResolvedValue(true);

      await expect(service.sign(1)).rejects.toThrow(NotFoundException);
      await expect(service.sign(1)).rejects.toThrow('今日已签到');
    });

    it('should not give bonus beyond max continuous days', async () => {
      mockRedisService.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      mockRedisService.getJson.mockResolvedValue({ continuousDays: 7 });
      mockPointsConfigService.getValue
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(7);
      mockUserService.findById.mockResolvedValue(mockUser);
      mockRepository.create.mockReturnValue(mockPointsLog);
      mockRepository.save.mockResolvedValue(mockPointsLog);
      mockUserService.updatePoints.mockResolvedValue({ ...mockUser, points: 2010 });
      mockRedisService.del.mockResolvedValue(1);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.setJson.mockResolvedValue('OK');

      const result = await service.sign(1);

      expect(result.pointsEarned).toBe(10);
    });
  });

  describe('getSignStatus', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return signed status when user signed today', async () => {
      mockRedisService.exists.mockResolvedValue(true);
      mockRedisService.getJson.mockResolvedValue({ continuousDays: 3 });

      const result = await service.getSignStatus(1);

      expect(result).toEqual({
        signedToday: true,
        continuousDays: 3,
      });
    });

    it('should return not signed status', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockRedisService.getJson.mockResolvedValue(null);

      const result = await service.getSignStatus(1);

      expect(result).toEqual({
        signedToday: false,
        continuousDays: 0,
      });
    });
  });

  describe('getLogs', () => {
    it('should return paginated logs', async () => {
      const mockLogs = [mockPointsLog];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockLogs, 1]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getLogs(1, 1, 20);

      expect(result).toEqual({
        list: mockLogs,
        total: 1,
        page: 1,
        pageSize: 20,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('log.userId = :userId', {
        userId: 1,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('log.createdAt', 'DESC');
    });

    it('should filter by type when provided', async () => {
      const mockLogs = [mockPointsLog];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockLogs, 1]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getLogs(1, 1, 20, PointsType.EARN);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.type = :type', {
        type: PointsType.EARN,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockLogs = [mockPointsLog];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockLogs, 50]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getLogs(1, 3, 10);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(50);
    });
  });
});
