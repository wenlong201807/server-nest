import { Test, TestingModule } from '@nestjs/testing';
import {
  PointsConfigController,
  PointsConfigPublicController,
} from '../points-config.controller';
import { PointsConfigService } from '../points-config.service';

describe('PointsConfigController', () => {
  let controller: PointsConfigController;
  let pointsConfigService: any;

  beforeEach(async () => {
    pointsConfigService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      batchUpdate: jest.fn(),
      initDefaultConfigs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointsConfigController],
      providers: [
        {
          provide: PointsConfigService,
          useValue: pointsConfigService,
        },
      ],
    }).compile();

    controller = module.get<PointsConfigController>(PointsConfigController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该调用 pointsConfigService.findAll', async () => {
      const mockList = [
        { key: 'points.register', value: 2000, description: '注册赠送积分', isEnabled: true },
      ];
      pointsConfigService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll();

      expect(result).toEqual({ list: mockList });
      expect(pointsConfigService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('应该调用 pointsConfigService.findOne', async () => {
      const mockConfig = { key: 'points.register', value: 2000, description: '注册赠送积分' };
      pointsConfigService.findOne.mockResolvedValue(mockConfig);

      const result = await controller.findOne('points.register');

      expect(result).toEqual(mockConfig);
      expect(pointsConfigService.findOne).toHaveBeenCalledWith('points.register');
    });
  });

  describe('update', () => {
    it('应该调用 pointsConfigService.update', async () => {
      const dto = { value: 3000, description: '更新注册积分' };
      pointsConfigService.update.mockResolvedValue(undefined);

      const result = await controller.update('points.register', dto);

      expect(result).toEqual({ message: '配置更新成功' });
      expect(pointsConfigService.update).toHaveBeenCalledWith('points.register', dto);
    });
  });

  describe('batchUpdate', () => {
    it('应该调用 pointsConfigService.batchUpdate', async () => {
      const dto = {
        configs: [
          { key: 'points.register', value: 2000, description: '注册赠送积分' },
          { key: 'points.sign', value: 10, description: '每日签到积分' },
        ],
      };
      pointsConfigService.batchUpdate.mockResolvedValue(undefined);

      const result = await controller.batchUpdate(dto);

      expect(result).toEqual({ message: '批量更新成功' });
      expect(pointsConfigService.batchUpdate).toHaveBeenCalledWith(dto.configs);
    });
  });

  describe('init', () => {
    it('应该调用 pointsConfigService.initDefaultConfigs', async () => {
      pointsConfigService.initDefaultConfigs.mockResolvedValue(undefined);

      const result = await controller.init();

      expect(result).toEqual({ message: '初始化成功' });
      expect(pointsConfigService.initDefaultConfigs).toHaveBeenCalled();
    });
  });
});

describe('PointsConfigPublicController', () => {
  let controller: PointsConfigPublicController;
  let pointsConfigService: any;

  beforeEach(async () => {
    pointsConfigService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointsConfigPublicController],
      providers: [
        {
          provide: PointsConfigService,
          useValue: pointsConfigService,
        },
      ],
    }).compile();

    controller = module.get<PointsConfigPublicController>(PointsConfigPublicController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该调用 pointsConfigService.findAll 并返回启用的配置', async () => {
      const mockList = [
        { key: 'points.register', value: 2000, isEnabled: true },
        { key: 'points.sign', value: 10, isEnabled: true },
        { key: 'points.disabled', value: 100, isEnabled: false },
      ];
      pointsConfigService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll();

      expect(result).toEqual({
        'points.register': 2000,
        'points.sign': 10,
      });
      expect(pointsConfigService.findAll).toHaveBeenCalled();
    });
  });
});
