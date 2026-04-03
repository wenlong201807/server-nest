import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from '../admin.controller';
import { AdminService } from '../admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: any;

  beforeEach(async () => {
    adminService = {
      sendSms: jest.fn(),
      login: jest.fn(),
      login22: jest.fn(),
      getUsers: jest.fn(),
      adjustPoints: jest.fn(),
      updateUserStatus: jest.fn(),
      getCertifications: jest.fn(),
      reviewCertification: jest.fn(),
      getPosts: jest.fn(),
      deletePost: jest.fn(),
      getReports: jest.fn(),
      handleReport: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
      getStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: adminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSms', () => {
    it('应该调用 adminService.sendSms', async () => {
      const dto = { mobile: '13800138000' };
      const mockResult = { message: '验证码已发送' };
      adminService.sendSms.mockResolvedValue(mockResult);

      const result = await controller.sendSms(dto);

      expect(result).toEqual(mockResult);
      expect(adminService.sendSms).toHaveBeenCalledWith(dto.mobile);
    });
  });

  describe('login', () => {
    it('应该调用 adminService.login', async () => {
      const dto = { account: '13800138000', code: '123456', loginType: 'mobile_sms' as any };
      const mockResult = { token: 'jwt-token', admin: { id: 1, mobile: '13800138000' } };
      adminService.login.mockResolvedValue(mockResult);

      const result = await controller.login(dto);

      expect(result).toEqual(mockResult);
      expect(adminService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('login22', () => {
    it('应该调用 adminService.login22', async () => {
      const dto = { account: 'admin', password: 'password123', loginType: 'username' as any };
      const mockResult = { token: 'jwt-token', admin: { id: 1, username: 'admin' } };
      adminService.login22.mockResolvedValue(mockResult);

      const result = await controller.login22(dto);

      expect(result).toEqual(mockResult);
      expect(adminService.login22).toHaveBeenCalledWith(dto);
    });
  });

  describe('getUsers', () => {
    it('应该调用 adminService.getUsers 并传递默认分页参数', async () => {
      const mockResult = { data: [], total: 0 };
      adminService.getUsers.mockResolvedValue(mockResult);

      const result = await controller.getUsers(1, 20);

      expect(result).toEqual(mockResult);
      expect(adminService.getUsers).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });

    it('应该调用 adminService.getUsers 并传递自定义参数', async () => {
      const page = 2;
      const pageSize = 10;
      const keyword = 'test';
      const status = 1;
      const mockResult = { data: [], total: 0 };
      adminService.getUsers.mockResolvedValue(mockResult);

      const result = await controller.getUsers(page, pageSize, keyword, status);

      expect(result).toEqual(mockResult);
      expect(adminService.getUsers).toHaveBeenCalledWith(page, pageSize, keyword, status);
    });
  });

  describe('adjustPoints', () => {
    it('应该调用 adminService.adjustPoints', async () => {
      const userId = 1;
      const amount = 100;
      const reason = '活动奖励';
      const mockResult = { message: '积分调整成功' };
      adminService.adjustPoints.mockResolvedValue(mockResult);

      const result = await controller.adjustPoints(userId, amount, reason);

      expect(result).toEqual(mockResult);
      expect(adminService.adjustPoints).toHaveBeenCalledWith(userId, amount, reason);
    });
  });

  describe('updateStatus', () => {
    it('应该调用 adminService.updateUserStatus', async () => {
      const userId = 1;
      const status = 0;
      const mockResult = { message: '用户状态更新成功' };
      adminService.updateUserStatus.mockResolvedValue(mockResult);

      const result = await controller.updateStatus(userId, status);

      expect(result).toEqual(mockResult);
      expect(adminService.updateUserStatus).toHaveBeenCalledWith(userId, status);
    });
  });

  describe('getCertifications', () => {
    it('应该调用 adminService.getCertifications 并传递默认分页参数', async () => {
      const mockResult = { data: [], total: 0 };
      adminService.getCertifications.mockResolvedValue(mockResult);

      const result = await controller.getCertifications(1, 20);

      expect(result).toEqual(mockResult);
      expect(adminService.getCertifications).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('应该调用 adminService.getCertifications 并传递自定义参数', async () => {
      const page = 2;
      const pageSize = 10;
      const status = 1;
      const mockResult = { data: [], total: 0 };
      adminService.getCertifications.mockResolvedValue(mockResult);

      const result = await controller.getCertifications(page, pageSize, status);

      expect(result).toEqual(mockResult);
      expect(adminService.getCertifications).toHaveBeenCalledWith(page, pageSize, status);
    });
  });

  describe('reviewCertification', () => {
    it('应该调用 adminService.reviewCertification 不带拒绝原因', async () => {
      const id = 1;
      const status = 2;
      const mockResult = { message: '审核成功' };
      adminService.reviewCertification.mockResolvedValue(mockResult);

      const result = await controller.reviewCertification(id, status);

      expect(result).toEqual(mockResult);
      expect(adminService.reviewCertification).toHaveBeenCalledWith(id, status, undefined);
    });

    it('应该调用 adminService.reviewCertification 带拒绝原因', async () => {
      const id = 1;
      const status = 3;
      const rejectReason = '资料不清晰';
      const mockResult = { message: '审核成功' };
      adminService.reviewCertification.mockResolvedValue(mockResult);

      const result = await controller.reviewCertification(id, status, rejectReason);

      expect(result).toEqual(mockResult);
      expect(adminService.reviewCertification).toHaveBeenCalledWith(id, status, rejectReason);
    });
  });

  describe('getPosts', () => {
    it('应该调用 adminService.getPosts 并传递默认分页参数', async () => {
      const mockResult = { data: [], total: 0 };
      adminService.getPosts.mockResolvedValue(mockResult);

      const result = await controller.getPosts(1, 20);

      expect(result).toEqual(mockResult);
      expect(adminService.getPosts).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });

    it('应该调用 adminService.getPosts 并传递自定义参数', async () => {
      const page = 2;
      const pageSize = 10;
      const status = 1;
      const keyword = 'test';
      const mockResult = { data: [], total: 0 };
      adminService.getPosts.mockResolvedValue(mockResult);

      const result = await controller.getPosts(page, pageSize, status, keyword);

      expect(result).toEqual(mockResult);
      expect(adminService.getPosts).toHaveBeenCalledWith(page, pageSize, status, keyword);
    });
  });

  describe('deletePost', () => {
    it('应该调用 adminService.deletePost 不带原因和扣分', async () => {
      const id = 1;
      const mockResult = { message: '删除成功' };
      adminService.deletePost.mockResolvedValue(mockResult);

      const result = await controller.deletePost(id);

      expect(result).toEqual(mockResult);
      expect(adminService.deletePost).toHaveBeenCalledWith(id, undefined, undefined);
    });

    it('应该调用 adminService.deletePost 带原因和扣分', async () => {
      const id = 1;
      const reason = '违规内容';
      const deductPoints = 50;
      const mockResult = { message: '删除成功' };
      adminService.deletePost.mockResolvedValue(mockResult);

      const result = await controller.deletePost(id, reason, deductPoints);

      expect(result).toEqual(mockResult);
      expect(adminService.deletePost).toHaveBeenCalledWith(id, reason, deductPoints);
    });
  });

  describe('getReports', () => {
    it('应该调用 adminService.getReports 并传递默认分页参数', async () => {
      const mockResult = { data: [], total: 0 };
      adminService.getReports.mockResolvedValue(mockResult);

      const result = await controller.getReports(1, 20);

      expect(result).toEqual(mockResult);
      expect(adminService.getReports).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('应该调用 adminService.getReports 并传递自定义参数', async () => {
      const page = 2;
      const pageSize = 10;
      const status = 1;
      const mockResult = { data: [], total: 0 };
      adminService.getReports.mockResolvedValue(mockResult);

      const result = await controller.getReports(page, pageSize, status);

      expect(result).toEqual(mockResult);
      expect(adminService.getReports).toHaveBeenCalledWith(page, pageSize, status);
    });
  });

  describe('handleReport', () => {
    it('应该调用 adminService.handleReport 不带扣分', async () => {
      const id = 1;
      const action = 'approve';
      const mockResult = { message: '处理成功' };
      adminService.handleReport.mockResolvedValue(mockResult);

      const result = await controller.handleReport(id, action);

      expect(result).toEqual(mockResult);
      expect(adminService.handleReport).toHaveBeenCalledWith(id, action, undefined);
    });

    it('应该调用 adminService.handleReport 带扣分', async () => {
      const id = 1;
      const action = 'approve';
      const deductPoints = 100;
      const mockResult = { message: '处理成功' };
      adminService.handleReport.mockResolvedValue(mockResult);

      const result = await controller.handleReport(id, action, deductPoints);

      expect(result).toEqual(mockResult);
      expect(adminService.handleReport).toHaveBeenCalledWith(id, action, deductPoints);
    });
  });

  describe('getConfig', () => {
    it('应该调用 adminService.getConfig', async () => {
      const mockResult = { key1: 'value1', key2: 'value2' };
      adminService.getConfig.mockResolvedValue(mockResult);

      const result = await controller.getConfig();

      expect(result).toEqual(mockResult);
      expect(adminService.getConfig).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('应该调用 adminService.updateConfig', async () => {
      const config = { key1: 'newValue1', key2: 'newValue2' };
      const mockResult = { message: '配置更新成功' };
      adminService.updateConfig.mockResolvedValue(mockResult);

      const result = await controller.updateConfig(config);

      expect(result).toEqual(mockResult);
      expect(adminService.updateConfig).toHaveBeenCalledWith(config);
    });
  });

  describe('getStatistics', () => {
    it('应该调用 adminService.getStatistics 不带日期参数', async () => {
      const mockResult = { users: 100, posts: 200 };
      adminService.getStatistics.mockResolvedValue(mockResult);

      const result = await controller.getStatistics();

      expect(result).toEqual(mockResult);
      expect(adminService.getStatistics).toHaveBeenCalledWith(undefined, undefined);
    });

    it('应该调用 adminService.getStatistics 带日期参数', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      const mockResult = { users: 100, posts: 200 };
      adminService.getStatistics.mockResolvedValue(mockResult);

      const result = await controller.getStatistics(startDate, endDate);

      expect(result).toEqual(mockResult);
      expect(adminService.getStatistics).toHaveBeenCalledWith(startDate, endDate);
    });
  });
});
