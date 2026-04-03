import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PasswordUtil } from '../../../common/utils/password.util';
import { PointsLog } from '../../points/entities/points-log.entity';
import { PointsSourceType } from '@common/constants';

describe('UserService', () => {
  let service: UserService;
  let mockRepository: any;
  let mockDataSource: any;

  const mockUser = {
    id: 1,
    mobile: '13800138000',
    password: 'hashed_password',
    nickname: 'Test User',
    gender: 1,
    points: 2000,
    inviteCode: 'ABC12345',
    inviterCode: null,
    status: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建用户', async () => {
      const createDto = {
        mobile: '13800138000',
        password: 'test123456',
        nickname: 'Test User',
        gender: 1,
        inviteCode: 'ABC12345',
        inviterCode: null,
      };

      jest.spyOn(PasswordUtil, 'hash').mockResolvedValue('hashed_password');
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createDto);

      expect(result).toEqual(mockUser);
      expect(PasswordUtil.hash).toHaveBeenCalledWith('test123456');
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('应该加密密码', async () => {
      const createDto = {
        mobile: '13800138000',
        password: 'plaintext',
        nickname: 'Test',
        gender: 1,
        inviteCode: 'ABC12345',
      };

      jest.spyOn(PasswordUtil, 'hash').mockResolvedValue('hashed_plaintext');
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.create(createDto);

      expect(PasswordUtil.hash).toHaveBeenCalledWith('plaintext');
    });
  });

  describe('findById', () => {
    it('应该返回存在的用户', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('应该抛出异常当用户不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow('用户不存在');
    });
  });

  describe('findByMobile', () => {
    it('应该返回存在的用户', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByMobile('13800138000');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { mobile: '13800138000' },
      });
    });

    it('应该返回 null 当用户不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByMobile('99999999999');

      expect(result).toBeNull();
    });
  });

  describe('findByInviteCode', () => {
    it('应该返回存在的用户', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByInviteCode('ABC12345');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { inviteCode: 'ABC12345' },
      });
    });

    it('应该返回 null 当邀请码不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByInviteCode('INVALID');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('应该成功更新用户', async () => {
      const updateDto = { nickname: 'Updated Name' };
      const updatedUser = { ...mockUser, nickname: 'Updated Name' };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(1, updateDto);

      expect(result.nickname).toBe('Updated Name');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('应该抛出异常当用户不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { nickname: 'Test' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updatePoints', () => {
    it('应该增加积分', async () => {
      const userWithPoints = { ...mockUser, points: 2100 };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(userWithPoints);

      const result = await service.updatePoints(1, 100);

      expect(result.points).toBe(2100);
    });

    it('应该减少积分', async () => {
      const userWithPoints = { ...mockUser, points: 1900 };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(userWithPoints);

      const result = await service.updatePoints(1, -100);

      expect(result.points).toBe(1900);
    });

    it('应该防止积分为负数', async () => {
      const userWithPoints = { ...mockUser, points: 0 };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(userWithPoints);

      const result = await service.updatePoints(1, -3000);

      expect(result.points).toBe(0);
    });
  });

  describe('delete', () => {
    it('应该软删除用户', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({ ...mockUser, deletedAt: new Date() });

      await service.delete(1);

      expect(mockRepository.save).toHaveBeenCalled();
      const savedUser = mockRepository.save.mock.calls[0][0];
      expect(savedUser.deletedAt).toBeDefined();
    });

    it('应该抛出异常当用户不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createWithTransaction', () => {
    it('应该在事务中创建用户并初始化积分', async () => {
      const createDto = {
        mobile: '13800138000',
        password: 'test123456',
        nickname: 'Test User',
        gender: 1,
        inviteCode: 'ABC12345',
        inviterCode: null,
      };

      const mockManager = {
        create: jest.fn().mockReturnValue(mockUser),
        save: jest.fn().mockResolvedValue(mockUser),
        findOne: jest.fn(),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      jest.spyOn(PasswordUtil, 'hash').mockResolvedValue('hashed_password');

      const result = await service.createWithTransaction(createDto);

      expect(result).toEqual(mockUser);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalledTimes(2); // 用户 + 积分日志
    });

    it('应该处理邀请人奖励', async () => {
      const createDto = {
        mobile: '13800138000',
        password: 'test123456',
        nickname: 'Test User',
        gender: 1,
        inviteCode: 'NEW12345',
        inviterCode: 'ABC12345',
      };

      const inviter = { ...mockUser, inviteCode: 'ABC12345', points: 2000 };

      const mockManager = {
        create: jest.fn().mockReturnValue(mockUser),
        save: jest.fn().mockResolvedValue(mockUser),
        findOne: jest.fn().mockResolvedValue(inviter),
      };

      mockDataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });

      jest.spyOn(PasswordUtil, 'hash').mockResolvedValue('hashed_password');

      await service.createWithTransaction(createDto);

      expect(mockManager.findOne).toHaveBeenCalledWith(User, {
        where: { inviteCode: 'ABC12345' },
      });
      expect(mockManager.save).toHaveBeenCalledTimes(4); // 用户 + 积分日志 + 邀请人 + 邀请人积分日志
    });

    it('应该在事务失败时回滚', async () => {
      const createDto = {
        mobile: '13800138000',
        password: 'test123456',
        nickname: 'Test User',
        gender: 1,
        inviteCode: 'ABC12345',
      };

      mockDataSource.transaction.mockRejectedValue(new Error('Transaction failed'));
      jest.spyOn(PasswordUtil, 'hash').mockResolvedValue('hashed_password');

      await expect(service.createWithTransaction(createDto)).rejects.toThrow(
        'Transaction failed'
      );
    });
  });
});
