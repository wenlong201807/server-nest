import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigService } from '../system-config.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemConfig } from '../system-config.entity';
import { NotFoundException } from '@nestjs/common';

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let mockRepository: any;

  const mockConfig = {
    id: 1,
    configKey: 'app.name',
    configValue: '同城互助',
    valueType: 'string',
    group: 'general',
    description: '应用名称',
    isPublic: true,
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
        SystemConfigService,
        {
          provide: getRepositoryToken(SystemConfig),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该返回所有配置', async () => {
      mockRepository.find.mockResolvedValue([mockConfig]);

      const result = await service.findAll();

      expect(result).toEqual([mockConfig]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { id: 'ASC' },
      });
    });
  });

  describe('findByKey', () => {
    it('应该返回存在的配置', async () => {
      mockRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.findByKey('app.name');

      expect(result).toEqual(mockConfig);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { configKey: 'app.name' },
      });
    });

    it('应该抛出异常当配置不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findByKey('invalid')).rejects.toThrow(NotFoundException);
      await expect(service.findByKey('invalid')).rejects.toThrow('配置 invalid 不存在');
    });
  });

  describe('getValue', () => {
    it('应该返回配置值', async () => {
      mockRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.getValue('app.name');

      expect(result).toBe('同城互助');
    });

    it('应该返回默认值当配置不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getValue('nonexistent', 'default');

      expect(result).toBe('default');
    });

    it('应该解析 JSON 值', async () => {
      const jsonConfig = { ...mockConfig, configValue: '{"key":"value"}' };
      mockRepository.findOne.mockResolvedValue(jsonConfig);

      const result = await service.getValue('app.name');

      expect(result).toEqual({ key: 'value' });
    });

    it('应该返回默认值当查询失败', async () => {
      mockRepository.findOne.mockRejectedValue(new Error('Database error'));

      const result = await service.getValue('app.name', 'default');

      expect(result).toBe('default');
    });
  });

  describe('getBoolean', () => {
    it('应该返回布尔值', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getBoolean('signup.enabled', true);

      expect(result).toBe(true);
    });

    it('应该返回 false 当值为 "false"', async () => {
      const boolConfig = { ...mockConfig, configValue: 'false' };
      mockRepository.findOne.mockResolvedValue(boolConfig);

      const result = await service.getBoolean('signup.enabled');

      expect(result).toBe(false);
    });

    it('应该返回默认值当配置不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getBoolean('nonexistent', true);

      expect(result).toBe(true);
    });
  });

  describe('getNumber', () => {
    it('应该返回数字值', async () => {
      const numConfig = { ...mockConfig, configValue: '100' };
      mockRepository.findOne.mockResolvedValue(numConfig);

      const result = await service.getNumber('friend.max_count');

      expect(result).toBe(100);
    });

    it('应该返回默认值当配置不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getNumber('nonexistent', 50);

      expect(result).toBe(50);
    });

    it('应该返回默认值当值无法解析为数字', async () => {
      const invalidConfig = { ...mockConfig, configValue: 'invalid' };
      mockRepository.findOne.mockResolvedValue(invalidConfig);

      const result = await service.getNumber('friend.max_count', 50);

      expect(result).toBe(50);
    });
  });

  describe('update', () => {
    it('应该更新存在的配置', async () => {
      const data = { configValue: '新值' };
      const updatedConfig = { ...mockConfig, ...data };

      mockRepository.findOne.mockResolvedValue(mockConfig);
      mockRepository.save.mockResolvedValue(updatedConfig);

      const result = await service.update('app.name', data);

      expect(result.configValue).toBe('新值');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('应该创建新配置当不存在时', async () => {
      const data = { configValue: '新值' };
      const newConfig = { configKey: 'new.key', ...data };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(newConfig);
      mockRepository.save.mockResolvedValue(newConfig);

      const result = await service.update('new.key', data);

      expect(mockRepository.create).toHaveBeenCalledWith({ configKey: 'new.key' });
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('应该创建系统配置', async () => {
      const data = {
        configKey: 'new.config',
        configValue: 'value',
        description: '新配置',
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
    it('应该删除系统配置', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete('app.name');

      expect(mockRepository.delete).toHaveBeenCalledWith({ configKey: 'app.name' });
    });
  });

  describe('getPublicConfigs', () => {
    it('应该返回公开配置', async () => {
      const configs = [
        { ...mockConfig, configKey: 'app.name', configValue: '同城互助', isPublic: true },
        { ...mockConfig, configKey: 'app.version', configValue: '1.0.0', isPublic: true },
        { ...mockConfig, configKey: 'secret.key', configValue: 'secret', isPublic: false },
      ];
      mockRepository.find.mockResolvedValue(configs);

      const result = await service.getPublicConfigs();

      expect(result).toEqual({
        app: {
          name: '同城互助',
          version: '1.0.0',
        },
      });
    });

    it('应该解析 JSON 值', async () => {
      const configs = [
        { ...mockConfig, configKey: 'app.features', configValue: '["feature1","feature2"]', isPublic: true },
      ];
      mockRepository.find.mockResolvedValue(configs);

      const result = await service.getPublicConfigs();

      expect(result).toEqual({
        app: {
          features: ['feature1', 'feature2'],
        },
      });
    });
  });

  describe('getGroups', () => {
    it('应该返回配置分组统计', async () => {
      const configs = [
        { ...mockConfig, configKey: 'app.name' },
        { ...mockConfig, configKey: 'app.version' },
        { ...mockConfig, configKey: 'signup.enabled' },
      ];
      mockRepository.find.mockResolvedValue(configs);

      const result = await service.getGroups();

      expect(result).toEqual([
        { name: 'app', count: 2 },
        { name: 'signup', count: 1 },
      ]);
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
