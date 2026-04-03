import { Test, TestingModule } from '@nestjs/testing';
import { PointsConfigService } from '../points-config.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PointsConfig } from '../entities/points-config.entity';
import { NotFoundException } from '@nestjs/common';

describe('PointsConfigService', () => {
  let service: PointsConfigService;
  let mockRepository: any;

  const mockConfig = {
    id: 1,
    key: 'register',
    value: 2000,
    description: '注册赠送',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsConfigService,
        {
          provide: getRepositoryToken(PointsConfig),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PointsConfigService>(PointsConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该返回所有积分配置', async () => {
      mockRepository.find.mockResolvedValue([mockConfig]);

      const result = await service.findAll();

      expect(result).toEqual([mockConfig]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { id: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('应该返回存在的配置', async () => {
      mockRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.findOne('register');

      expect(result).toEqual(mockConfig);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { key: 'register' },
      });
    });

    it('应该抛出异常当配置不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid')).rejects.toThrow('积分配置 invalid 不存在');
    });
  });

  describe('getValue', () => {
    it('应该返回配置值', async () => {
      mockRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.getValue('register');

      expect(result).toBe(2000);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { key: 'register', isEnabled: true },
      });
    });

    it('应该返回默认值当配置不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getValue('nonexistent', 100);

      expect(result).toBe(100);
    });

    it('应该返回默认值当配置被禁用', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getValue('register', 100);

      expect(result).toBe(100);
    });

    it('应该返回默认值当查询失败', async () => {
      mockRepository.findOne.mockRejectedValue(new Error('Database error'));

      const result = await service.getValue('register', 100);

      expect(result).toBe(100);
    });
  });

  describe('update', () => {
    it('应该更新存在的配置', async () => {
      const data = { value: 3000, description: '更新后的描述' };
      const updatedConfig = { ...mockConfig, ...data };

      mockRepository.findOne.mockResolvedValue(mockConfig);
      mockRepository.save.mockResolvedValue(updatedConfig);

      const result = await service.update('register', data);

      expect(result.value).toBe(3000);
      expect(result.description).toBe('更新后的描述');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('应该创建新配置当不存在时', async () => {
      const data = { value: 50 };
      const newConfig = { key: 'new_key', ...data };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(newConfig);
      mockRepository.save.mockResolvedValue(newConfig);

      const result = await service.update('new_key', data);

      expect(mockRepository.create).toHaveBeenCalledWith({ key: 'new_key' });
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('应该创建积分配置', async () => {
      const data = {
        key: 'new_action',
        value: 50,
        description: '新动作',
      };

      mockRepository.create.mockReturnValue(mockConfig);
      mockRepository.save.mockResolvedValue(mockConfig);

      const result = await service.create(data);

      expect(result).toEqual(mockConfig);
      expect(mockRepository.create).toHaveBeenCalledWith(data);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('应该删除积分配置', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('batchUpdate', () => {
    it('应该批量更新配置', async () => {
      const configs = [
        { key: 'register', value: 3000, description: '注册奖励' },
        { key: 'sign', value: 20, description: '签到奖励' },
      ];

      mockRepository.findOne.mockResolvedValue(mockConfig);
      mockRepository.save.mockResolvedValue(mockConfig);

      await service.batchUpdate(configs);

      expect(mockRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('initDefaultConfigs', () => {
    it('应该初始化默认配置', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockConfig);

      await service.initDefaultConfigs();

      expect(mockRepository.save).toHaveBeenCalledTimes(10);
    });

    it('应该跳过已存在的配置', async () => {
      mockRepository.findOne.mockResolvedValue(mockConfig);

      await service.initDefaultConfigs();

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
