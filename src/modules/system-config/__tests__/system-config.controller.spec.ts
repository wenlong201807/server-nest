import { Test, TestingModule } from '@nestjs/testing';
import {
  SystemConfigAdminController,
  SystemConfigPublicController,
} from '../system-config.controller';
import { SystemConfigService } from '../system-config.service';

describe('SystemConfigAdminController', () => {
  let controller: SystemConfigAdminController;
  let systemConfigService: any;

  beforeEach(async () => {
    systemConfigService = {
      findAll: jest.fn(),
      getGroups: jest.fn(),
      findByKey: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      initDefaultConfigs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemConfigAdminController],
      providers: [
        {
          provide: SystemConfigService,
          useValue: systemConfigService,
        },
      ],
    }).compile();

    controller = module.get<SystemConfigAdminController>(SystemConfigAdminController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该调用 systemConfigService.findAll', async () => {
      const mockList = [
        { configKey: 'app.name', configValue: 'MyApp', group: 'app' },
      ];
      systemConfigService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll();

      expect(result).toEqual({ list: mockList });
      expect(systemConfigService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('应该支持分组过滤', async () => {
      const mockList = [
        { configKey: 'app.name', configValue: 'MyApp', group: 'app' },
      ];
      systemConfigService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll('app');

      expect(result).toEqual({ list: mockList });
      expect(systemConfigService.findAll).toHaveBeenCalledWith('app');
    });
  });

  describe('getGroups', () => {
    it('应该调用 systemConfigService.getGroups', async () => {
      const mockGroups = ['app', 'system', 'feature'];
      systemConfigService.getGroups.mockResolvedValue(mockGroups);

      const result = await controller.getGroups();

      expect(result).toEqual({ list: mockGroups });
      expect(systemConfigService.getGroups).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('应该调用 systemConfigService.findByKey', async () => {
      const mockConfig = { configKey: 'app.name', configValue: 'MyApp' };
      systemConfigService.findByKey.mockResolvedValue(mockConfig);

      const result = await controller.findOne('app.name');

      expect(result).toEqual(mockConfig);
      expect(systemConfigService.findByKey).toHaveBeenCalledWith('app.name');
    });
  });

  describe('create', () => {
    it('应该调用 systemConfigService.create', async () => {
      const dto = {
        configKey: 'app.version',
        configValue: '1.0.0',
        valueType: 'string',
        group: 'app',
        description: '应用版本',
        isPublic: true,
      };
      const mockConfig = { id: 1, ...dto };
      systemConfigService.create.mockResolvedValue(mockConfig);

      const result = await controller.create(dto);

      expect(result).toEqual(mockConfig);
      expect(systemConfigService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('应该调用 systemConfigService.update', async () => {
      const dto = { configValue: '2.0.0', description: '更新版本' };
      systemConfigService.update.mockResolvedValue(undefined);

      const result = await controller.update('app.version', dto);

      expect(result).toEqual({ message: '配置更新成功' });
      expect(systemConfigService.update).toHaveBeenCalledWith('app.version', dto);
    });
  });

  describe('delete', () => {
    it('应该调用 systemConfigService.delete', async () => {
      systemConfigService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('app.version');

      expect(result).toEqual({ message: '删除成功' });
      expect(systemConfigService.delete).toHaveBeenCalledWith('app.version');
    });
  });

  describe('init', () => {
    it('应该调用 systemConfigService.initDefaultConfigs', async () => {
      systemConfigService.initDefaultConfigs.mockResolvedValue(undefined);

      const result = await controller.init();

      expect(result).toEqual({ message: '初始化成功' });
      expect(systemConfigService.initDefaultConfigs).toHaveBeenCalled();
    });
  });
});

describe('SystemConfigPublicController', () => {
  let controller: SystemConfigPublicController;
  let systemConfigService: any;

  beforeEach(async () => {
    systemConfigService = {
      getPublicConfigs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemConfigPublicController],
      providers: [
        {
          provide: SystemConfigService,
          useValue: systemConfigService,
        },
      ],
    }).compile();

    controller = module.get<SystemConfigPublicController>(SystemConfigPublicController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicConfig', () => {
    it('应该调用 systemConfigService.getPublicConfigs', async () => {
      const mockConfigs = {
        'app.name': 'MyApp',
        'app.version': '1.0.0',
      };
      systemConfigService.getPublicConfigs.mockResolvedValue(mockConfigs);

      const result = await controller.getPublicConfig();

      expect(result).toEqual(mockConfigs);
      expect(systemConfigService.getPublicConfigs).toHaveBeenCalled();
    });
  });
});
