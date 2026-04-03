import { Test, TestingModule } from '@nestjs/testing';
import { PointsService } from '../points.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PointsLog } from '../entities/points-log.entity';
import { UserService } from '../../user/user.service';
import { RedisService } from '../../../common/redis/redis.service';
import { PointsConfigService } from '../../points-config/points-config.service';
import { NotFoundException } from '@nestjs/common';
import { PointsType, PointsSourceType } from '@common/constants';

describe('PointsService', () => {
  let service: PointsService;
  let pointsLogRepository: any;
  let userService: any;
  let redisService: any;
  let pointsConfigService: any;

  const mockUser = {
    id: 1,
    mobile: '13800138000',
    nickname: 'User 1',
    points: 1000,
  };

  beforeEach(async () => {
    pointsLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
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

    userService = {
      findById: jest.fn(),
      updatePoints: jest.fn(),
    };

    redisService = {
      exists: jest.fn(),
      set: jest.fn(),
      setJson: jest.fn(),
      getJson: jest.fn(),
      del: jest.fn(),
    };

    pointsConfigService = {
      getValue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        {
          provide: getRepositoryToken(PointsLog),
          useValue: pointsLogRepository,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: PointsConfigService,
          useValue: pointsConfigService,
        },
      ],
    }).compile();

    service = module.get<PointsService>(PointsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('应该返回用户积分余额', async () => {
      userService.findById.mockResolvedValue(mockUser);
      pointsLogRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn()
          .mockResolvedValueOnce({ total: '500' })
          .mockResolvedValueOnce({ total: '200' }),
      });

      const result = await service.getBalance(1);

      expect(result).toEqual({
        balance: 1000,
        totalEarned: 500,
        totalConsumed: 200,
      });
      expect(userService.findById).toHaveBeenCalledWith(1);
    });

    it('应该处理没有积分记录的情况', async () => {
      userService.findById.mockResolvedValue(mockUser);
      pointsLogRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn()
          .mockResolvedValueOnce({ total: null })
          .mockResolvedValueOnce({ total: null }),
      });

      const result = await service.getBalance(1);

      expect(result).toEqual({
        balance: 1000,
        totalEarned: 0,
        totalConsumed: 0,
      });
    });
  });

  describe('addPoints', () => {
    it('应该成功增加积分', async () => {
      userService.findById.mockResolvedValue(mockUser);
      const mockLog = {
        userId: 1,
        type: PointsType.EARN,
        amount: 100,
        balanceAfter: 1100,
        sourceType: PointsSourceType.SIGN,
        sourceId: 0,
        description: '每日签到',
      };
      pointsLogRepository.create.mockReturnValue(mockLog);
      pointsLogRepository.save.mockResolvedValue(mockLog);
      userService.updatePoints.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);

      await service.addPoints(1, 100, PointsSourceType.SIGN, 0, '每日签到');

      expect(pointsLogRepository.create).toHaveBeenCalledWith({
        userId: 1,
        type: PointsType.EARN,
        amount: 100,
        balanceAfter: 1100,
        sourceType: PointsSourceType.SIGN,
        sourceId: 0,
        description: '每日签到',
      });
      expect(pointsLogRepository.save).toHaveBeenCalledWith(mockLog);
      expect(userService.updatePoints).toHaveBeenCalledWith(1, 100);
      expect(redisService.del).toHaveBeenCalledWith('user:1');
    });

    it('应该成功扣除积分', async () => {
      userService.findById.mockResolvedValue(mockUser);
      const mockLog = {
        userId: 1,
        type: PointsType.CONSUME,
        amount: -50,
        balanceAfter: 950,
        sourceType: PointsSourceType.UNLOCK_CHAT,
        sourceId: 2,
        description: '解锁私聊',
      };
      pointsLogRepository.create.mockReturnValue(mockLog);
      pointsLogRepository.save.mockResolvedValue(mockLog);
      userService.updatePoints.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);

      await service.addPoints(1, -50, PointsSourceType.UNLOCK_CHAT, 2, '解锁私聊');

      expect(pointsLogRepository.create).toHaveBeenCalledWith({
        userId: 1,
        type: PointsType.CONSUME,
        amount: -50,
        balanceAfter: 950,
        sourceType: PointsSourceType.UNLOCK_CHAT,
        sourceId: 2,
        description: '解锁私聊',
      });
    });

    it('应该使用默认描述', async () => {
      userService.findById.mockResolvedValue(mockUser);
      pointsLogRepository.create.mockReturnValue({});
      pointsLogRepository.save.mockResolvedValue({});
      userService.updatePoints.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);

      await service.addPoints(1, 100, PointsSourceType.REGISTER);

      expect(pointsLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: '注册赠送',
        }),
      );
    });
  });

  describe('sign', () => {
    it('应该成功签到', async () => {
      const today = new Date().toISOString().split('T')[0];
      redisService.exists.mockResolvedValue(false);
      pointsConfigService.getValue
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(7);
      userService.findById.mockResolvedValue(mockUser);
      pointsLogRepository.create.mockReturnValue({});
      pointsLogRepository.save.mockResolvedValue({});
      userService.updatePoints.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);
      redisService.set.mockResolvedValue(undefined);
      redisService.setJson.mockResolvedValue(undefined);
      redisService.getJson.mockResolvedValue(null);

      const result = await service.sign(1);

      expect(result).toEqual({
        pointsEarned: 10,
        continuousDays: 1,
        balance: 1000,
      });
      expect(redisService.set).toHaveBeenCalledWith(`sign:1:${today}`, '1', 24 * 60 * 60);
      expect(redisService.setJson).toHaveBeenCalledWith(
        'sign:last:1',
        { continuousDays: 1 },
        30 * 24 * 60 * 60,
      );
    });

    it('应该拒绝重复签到', async () => {
      redisService.exists.mockResolvedValue(true);

      await expect(service.sign(1)).rejects.toThrow(NotFoundException);
      await expect(service.sign(1)).rejects.toThrow('今日已签到');
    });

    it('应该计算连续签到奖励', async () => {
      redisService.exists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      redisService.getJson.mockResolvedValue({ continuousDays: 2 });
      pointsConfigService.getValue
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(7);
      userService.findById.mockResolvedValue(mockUser);
      pointsLogRepository.create.mockReturnValue({});
      pointsLogRepository.save.mockResolvedValue({});
      userService.updatePoints.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);
      redisService.set.mockResolvedValue(undefined);
      redisService.setJson.mockResolvedValue(undefined);

      const result = await service.sign(1);

      expect(result.pointsEarned).toBe(15);
      expect(result.continuousDays).toBe(3);
    });

    it('应该限制连续签到奖励上限', async () => {
      redisService.exists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      redisService.getJson.mockResolvedValue({ continuousDays: 7 });
      pointsConfigService.getValue
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(7);
      userService.findById.mockResolvedValue(mockUser);
      pointsLogRepository.create.mockReturnValue({});
      pointsLogRepository.save.mockResolvedValue({});
      userService.updatePoints.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);
      redisService.set.mockResolvedValue(undefined);
      redisService.setJson.mockResolvedValue(undefined);

      const result = await service.sign(1);

      expect(result.pointsEarned).toBe(10);
      expect(result.continuousDays).toBe(8);
    });
  });

  describe('getSignStatus', () => {
    it('应该返回签到状态', async () => {
      redisService.exists.mockResolvedValue(true);
      redisService.getJson.mockResolvedValue({ continuousDays: 5 });

      const result = await service.getSignStatus(1);

      expect(result).toEqual({
        signedToday: true,
        continuousDays: 5,
      });
    });

    it('应该返回未签到状态', async () => {
      redisService.exists.mockResolvedValue(false);
      redisService.getJson.mockResolvedValue(null);

      const result = await service.getSignStatus(1);

      expect(result).toEqual({
        signedToday: false,
        continuousDays: 0,
      });
    });
  });

  describe('getLogs', () => {
    it('应该返回积分日志列表', async () => {
      const mockLogs = [
        { id: 1, userId: 1, amount: 100, type: PointsType.EARN },
        { id: 2, userId: 1, amount: -50, type: PointsType.CONSUME },
      ];
      pointsLogRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockLogs, 2]),
      });

      const result = await service.getLogs(1, 1, 20);

      expect(result).toEqual({
        list: mockLogs,
        total: 2,
        page: 1,
        pageSize: 20,
      });
    });

    it('应该支持按类型筛选', async () => {
      const mockLogs = [{ id: 1, userId: 1, amount: 100, type: PointsType.EARN }];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockLogs, 1]),
      };
      pointsLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getLogs(1, 1, 20, PointsType.EARN);

      expect(result.list).toEqual(mockLogs);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.type = :type', {
        type: PointsType.EARN,
      });
    });

    it('应该支持分页', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      pointsLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getLogs(1, 2, 10);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('边界测试', () => {
    it('应该处理大额积分变动', async () => {
      const richUser = { ...mockUser, points: 1000000 };
      userService.findById.mockResolvedValue(richUser);
      pointsLogRepository.create.mockReturnValue({});
      pointsLogRepository.save.mockResolvedValue({});
      userService.updatePoints.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);

      await service.addPoints(1, 100000, PointsSourceType.INVITE);

      expect(pointsLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100000,
          balanceAfter: 1100000,
        }),
      );
    });

    it('应该处理负积分余额', async () => {
      const poorUser = { ...mockUser, points: 10 };
      userService.findById.mockResolvedValue(poorUser);
      pointsLogRepository.create.mockReturnValue({});
      pointsLogRepository.save.mockResolvedValue({});
      userService.updatePoints.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);

      await service.addPoints(1, -50, PointsSourceType.DEDUCT_VIOLATION);

      expect(pointsLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          balanceAfter: -40,
        }),
      );
    });
  });
});
