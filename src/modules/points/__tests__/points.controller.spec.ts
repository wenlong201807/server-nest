import { Test, TestingModule } from '@nestjs/testing';
import { PointsController } from '../points.controller';
import { PointsService } from '../points.service';

describe('PointsController', () => {
  let controller: PointsController;
  let pointsService: any;

  beforeEach(async () => {
    pointsService = {
      getBalance: jest.fn(),
      sign: jest.fn(),
      getSignStatus: jest.fn(),
      getLogs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointsController],
      providers: [
        {
          provide: PointsService,
          useValue: pointsService,
        },
      ],
    }).compile();

    controller = module.get<PointsController>(PointsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('应该调用 pointsService.getBalance', async () => {
      const userId = 1;
      const mockResult = { balance: 100 };
      pointsService.getBalance.mockResolvedValue(mockResult);

      const result = await controller.getBalance(userId);

      expect(result).toEqual(mockResult);
      expect(pointsService.getBalance).toHaveBeenCalledWith(userId);
    });
  });

  describe('sign', () => {
    it('应该调用 pointsService.sign', async () => {
      const userId = 1;
      const mockResult = { points: 10, message: '签到成功' };
      pointsService.sign.mockResolvedValue(mockResult);

      const result = await controller.sign(userId);

      expect(result).toEqual(mockResult);
      expect(pointsService.sign).toHaveBeenCalledWith(userId);
    });
  });

  describe('getSignStatus', () => {
    it('应该调用 pointsService.getSignStatus', async () => {
      const userId = 1;
      const mockResult = { signed: true, lastSignDate: '2026-04-03' };
      pointsService.getSignStatus.mockResolvedValue(mockResult);

      const result = await controller.getSignStatus(userId);

      expect(result).toEqual(mockResult);
      expect(pointsService.getSignStatus).toHaveBeenCalledWith(userId);
    });
  });

  describe('getLogs', () => {
    it('应该调用 pointsService.getLogs 并传递分页参数', async () => {
      const userId = 1;
      const page = 1;
      const pageSize = 20;
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
      pointsService.getLogs.mockResolvedValue(mockResult);

      const result = await controller.getLogs(userId, page, pageSize);

      expect(result).toEqual(mockResult);
      expect(pointsService.getLogs).toHaveBeenCalledWith(userId, page, pageSize, undefined);
    });

    it('应该调用 pointsService.getLogs 并传递类型参数', async () => {
      const userId = 1;
      const page = 2;
      const pageSize = 10;
      const type = 1;
      const mockResult = {
        data: [],
        total: 0,
        page: 2,
        pageSize: 10,
      };
      pointsService.getLogs.mockResolvedValue(mockResult);

      const result = await controller.getLogs(userId, page, pageSize, type);

      expect(result).toEqual(mockResult);
      expect(pointsService.getLogs).toHaveBeenCalledWith(userId, page, pageSize, type);
    });
  });
});
