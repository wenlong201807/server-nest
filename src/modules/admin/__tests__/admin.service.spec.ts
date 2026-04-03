import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../admin.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { PointsService } from '../../points/points.service';
import { SquareService } from '../../square/square.service';
import { CertificationService } from '../../certification/certification.service';
import { PointsConfigService } from '../../points-config/points-config.service';
import { RedisService } from '@common/redis/redis.service';
import { User } from '../../user/entities/user.entity';
import { Certification } from '../../certification/entities/certification.entity';
import { PostReport } from '../../square/entities/report.entity';
import { SquarePost } from '../../square/entities/post.entity';
import {
  UserStatus,
  CertificationStatus,
  PostStatus,
  HandleStatus,
  PointsSourceType,
} from '@common/constants';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { LoginType } from '../dto/admin.dto';

describe('AdminService', () => {
  let service: AdminService;
  let userRepository: any;
  let certificationRepository: any;
  let reportRepository: any;
  let postRepository: any;
  let userService: any;
  let pointsService: any;
  let squareService: any;
  let certificationService: any;
  let pointsConfigService: any;
  let jwtService: any;
  let configService: any;
  let redisService: any;

  const mockUser = {
    id: 1,
    mobile: '13800138000',
    nickname: 'Test User',
    points: 2000,
    status: UserStatus.NORMAL,
    deletedAt: null,
  };

  const mockCertification = {
    id: 1,
    userId: 1,
    status: CertificationStatus.PENDING,
    user: mockUser,
    createdAt: new Date(),
  };

  const mockPost = {
    id: 1,
    userId: 1,
    content: 'Test post',
    status: PostStatus.NORMAL,
    user: mockUser,
    createdAt: new Date(),
  };

  const mockReport = {
    id: 1,
    postId: 1,
    reporterId: 2,
    reason: 'Spam',
    status: HandleStatus.PENDING,
    post: mockPost,
    reporter: mockUser,
    handledAt: null,
    handledBy: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
    };

    userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      count: jest.fn(),
      save: jest.fn(),
    };

    certificationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        ...mockQueryBuilder,
        getManyAndCount: jest.fn().mockResolvedValue([[mockCertification], 1]),
      }),
    };

    reportRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        ...mockQueryBuilder,
        getManyAndCount: jest.fn().mockResolvedValue([[mockReport], 1]),
      }),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    postRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        ...mockQueryBuilder,
        getManyAndCount: jest.fn().mockResolvedValue([[mockPost], 1]),
      }),
      findOne: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    userService = {
      findById: jest.fn(),
    };

    pointsService = {
      addPoints: jest.fn(),
    };

    squareService = {};

    certificationService = {
      approve: jest.fn(),
      reject: jest.fn(),
    };

    pointsConfigService = {
      findAll: jest.fn(),
      batchUpdate: jest.fn(),
    };

    jwtService = {
      sign: jest.fn(),
    };

    configService = {
      get: jest.fn((key) => {
        if (key === 'ADMIN_USERNAME') return 'admin';
        if (key === 'ADMIN_PASSWORD') return 'admin123';
        if (key === 'ADMIN_CONFIG') return {
          admins: [
            { id: 1, username: 'admin', mobile: '13800138000', role: 'super_admin' },
          ],
        };
        return null;
      }),
    };

    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      setJson: jest.fn(),
      getJson: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Certification),
          useValue: certificationRepository,
        },
        {
          provide: getRepositoryToken(PostReport),
          useValue: reportRepository,
        },
        {
          provide: getRepositoryToken(SquarePost),
          useValue: postRepository,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: PointsService,
          useValue: pointsService,
        },
        {
          provide: SquareService,
          useValue: squareService,
        },
        {
          provide: CertificationService,
          useValue: certificationService,
        },
        {
          provide: PointsConfigService,
          useValue: pointsConfigService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSms', () => {
    it('应该成功发送验证码', async () => {
      redisService.get.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);
      redisService.set.mockResolvedValue(undefined);

      const result = await service.sendSms('13800138000');

      expect(result).toEqual({ message: '验证码已发送' });
      expect(redisService.setJson).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalledWith('admin:sms:rate:13800138000', '1', 60);
    });

    it('应该拒绝频繁发送', async () => {
      redisService.get.mockResolvedValue('1');

      await expect(service.sendSms('13800138000')).rejects.toThrow(UnauthorizedException);
      await expect(service.sendSms('13800138000')).rejects.toThrow('发送过于频繁');
    });
  });

  describe('login', () => {
    describe('密码登录', () => {
      it('应该成功使用密码登录', async () => {
        const dto = {
          account: 'admin',
          password: 'admin123',
          loginType: LoginType.USERNAME,
        };
        jwtService.sign.mockReturnValue('mock_token');

        const result = await service.login(dto);

        expect(result.token).toBe('mock_token');
        expect(result.admin.username).toBe('admin');
        expect(result.admin.role).toBe('super_admin');
      });

      it('应该拒绝错误的用户名', async () => {
        const dto = {
          account: 'wronguser',
          password: 'admin123',
          loginType: LoginType.USERNAME,
        };

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        await expect(service.login(dto)).rejects.toThrow('管理员不存在');
      });

      it('应该拒绝错误的密码', async () => {
        const dto = {
          account: 'admin',
          password: 'wrongpassword',
          loginType: LoginType.USERNAME,
        };

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        await expect(service.login(dto)).rejects.toThrow('密码错误');
      });

      it('应该拒绝空密码', async () => {
        const dto = {
          account: 'admin',
          password: '',
          loginType: LoginType.USERNAME,
        };

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        await expect(service.login(dto)).rejects.toThrow('密码不能为空');
      });

      it('应该使用默认用户名和密码', async () => {
        configService.get.mockReturnValue(null);
        const dto = {
          account: 'admin',
          password: 'admin123',
          loginType: LoginType.USERNAME,
        };
        jwtService.sign.mockReturnValue('mock_token');

        const result = await service.login(dto);

        expect(result.token).toBe('mock_token');
        expect(result.admin.username).toBe('admin');
      });
    });

    describe('短信验证码登录', () => {
      it('应该成功使用短信验证码登录', async () => {
        const dto = {
          account: '13800138000',
          code: '123456',
          loginType: LoginType.MOBILE_SMS,
        };
        redisService.getJson.mockResolvedValue({ code: '123456' });
        redisService.del.mockResolvedValue(undefined);
        jwtService.sign.mockReturnValue('mock_token');

        const result = await service.login(dto);

        expect(result.token).toBe('mock_token');
        expect(result.admin.mobile).toBe('13800138000');
        expect(redisService.del).toHaveBeenCalledWith('admin:sms:code:13800138000');
      });

      it('应该拒绝空验证码', async () => {
        const dto = {
          account: '13800138000',
          code: '',
          loginType: LoginType.MOBILE_SMS,
        };

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        await expect(service.login(dto)).rejects.toThrow('验证码不能为空');
      });

      it('应该拒绝过期的验证码', async () => {
        const dto = {
          account: '13800138000',
          code: '123456',
          loginType: LoginType.MOBILE_SMS,
        };
        redisService.getJson.mockResolvedValue(null);

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        await expect(service.login(dto)).rejects.toThrow('验证码已过期');
      });

      it('应该拒绝错误的验证码', async () => {
        const dto = {
          account: '13800138000',
          code: '999999',
          loginType: LoginType.MOBILE_SMS,
        };
        redisService.getJson.mockResolvedValue({ code: '123456' });

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        await expect(service.login(dto)).rejects.toThrow('验证码错误');
      });

      it('应该拒绝未绑定的手机号', async () => {
        const dto = {
          account: '99999999999',
          code: '123456',
          loginType: LoginType.MOBILE_SMS,
        };
        redisService.getJson.mockResolvedValue({ code: '123456' });

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        await expect(service.login(dto)).rejects.toThrow('该手机号未绑定管理员');
      });

      it('应该处理空adminConfig', async () => {
        const dto = {
          account: '13800138000',
          code: '123456',
          loginType: LoginType.MOBILE_SMS,
        };
        redisService.getJson.mockResolvedValue({ code: '123456' });
        configService.get.mockReturnValue(null);

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        await expect(service.login(dto)).rejects.toThrow('该手机号未绑定管理员');
      });

      it('应该使用默认admin id', async () => {
        const dto = {
          account: '13800138000',
          code: '123456',
          loginType: LoginType.MOBILE_SMS,
        };
        redisService.getJson.mockResolvedValue({ code: '123456' });
        redisService.del.mockResolvedValue(undefined);
        jwtService.sign.mockReturnValue('mock_token');
        configService.get.mockReturnValue({
          admins: [
            { username: 'admin', mobile: '13800138000', role: 'super_admin' },
          ],
        });

        const result = await service.login(dto);

        expect(result.token).toBe('mock_token');
        expect(result.admin.id).toBe(1);
      });
    });
  });

  describe('getUsers', () => {
    it('应该返回用户列表', async () => {
      const result = await service.getUsers(1, 20);

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该脱敏手机号', async () => {
      const result = await service.getUsers(1, 20);

      expect(result.list[0].mobile).toBe('138****8000');
    });

    it('应该支持关键词搜索', async () => {
      const mockQueryBuilder = userRepository.createQueryBuilder();
      await service.getUsers(1, 20, 'test');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.mobile LIKE :keyword OR user.nickname LIKE :keyword)',
        { keyword: '%test%' }
      );
    });

    it('应该支持状态筛选', async () => {
      const mockQueryBuilder = userRepository.createQueryBuilder();
      await service.getUsers(1, 20, undefined, UserStatus.NORMAL);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.status = :status', {
        status: UserStatus.NORMAL,
      });
    });

    it('应该同时支持关键词和状态筛选', async () => {
      const mockQueryBuilder = userRepository.createQueryBuilder();
      await service.getUsers(1, 20, 'test', UserStatus.BANNED);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.mobile LIKE :keyword OR user.nickname LIKE :keyword)',
        { keyword: '%test%' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.status = :status', {
        status: UserStatus.BANNED,
      });
    });

    it('应该处理空手机号', async () => {
      const mockQueryBuilder = userRepository.createQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ ...mockUser, mobile: '' }], 1]);
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUsers(1, 20);

      expect(result.list[0].mobile).toBe('');
    });

    it('应该忽略NaN状态值', async () => {
      const mockQueryBuilder = userRepository.createQueryBuilder();
      await service.getUsers(1, 20, undefined, NaN);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('user.status = :status', expect.any(Object));
    });

    it('应该使用默认分页参数', async () => {
      const result = await service.getUsers();

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('adjustPoints', () => {
    it('应该成功调整积分', async () => {
      pointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.adjustPoints(1, 100, '管理员调整');

      expect(result).toEqual({ message: '积分调整成功' });
      expect(pointsService.addPoints).toHaveBeenCalledWith(
        1,
        100,
        PointsSourceType.REGISTER,
        0,
        '管理员调整'
      );
    });

    it('应该支持负数积分调整', async () => {
      pointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.adjustPoints(1, -50, '扣除违规积分');

      expect(result).toEqual({ message: '积分调整成功' });
      expect(pointsService.addPoints).toHaveBeenCalledWith(
        1,
        -50,
        PointsSourceType.REGISTER,
        0,
        '扣除违规积分'
      );
    });

    it('应该支持零积分调整', async () => {
      pointsService.addPoints.mockResolvedValue(undefined);

      const result = await service.adjustPoints(1, 0, '测试调整');

      expect(result).toEqual({ message: '积分调整成功' });
      expect(pointsService.addPoints).toHaveBeenCalledWith(
        1,
        0,
        PointsSourceType.REGISTER,
        0,
        '测试调整'
      );
    });
  });

  describe('updateUserStatus', () => {
    it('应该成功更新用户状态', async () => {
      userService.findById.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({ ...mockUser, status: UserStatus.BANNED });

      const result = await service.updateUserStatus(1, UserStatus.BANNED);

      expect(result).toEqual({ message: '状态更新成功' });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('应该更新为正常状态', async () => {
      userService.findById.mockResolvedValue({ ...mockUser, status: UserStatus.BANNED });
      userRepository.save.mockResolvedValue({ ...mockUser, status: UserStatus.NORMAL });

      const result = await service.updateUserStatus(1, UserStatus.NORMAL);

      expect(result).toEqual({ message: '状态更新成功' });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.NORMAL })
      );
    });

    it('应该更新为禁言状态', async () => {
      userService.findById.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({ ...mockUser, status: UserStatus.MUTED });

      const result = await service.updateUserStatus(1, UserStatus.MUTED);

      expect(result).toEqual({ message: '状态更新成功' });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.MUTED })
      );
    });
  });

  describe('getCertifications', () => {
    it('应该返回认证列表', async () => {
      const result = await service.getCertifications(1, 20);

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该支持状态筛选', async () => {
      const mockQueryBuilder = certificationRepository.createQueryBuilder();
      await service.getCertifications(1, 20, CertificationStatus.PENDING);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cert.status = :status', {
        status: CertificationStatus.PENDING,
      });
    });

    it('应该筛选已通过的认证', async () => {
      const mockQueryBuilder = certificationRepository.createQueryBuilder();
      await service.getCertifications(1, 20, CertificationStatus.APPROVED);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cert.status = :status', {
        status: CertificationStatus.APPROVED,
      });
    });

    it('应该筛选已拒绝的认证', async () => {
      const mockQueryBuilder = certificationRepository.createQueryBuilder();
      await service.getCertifications(1, 20, CertificationStatus.REJECTED);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cert.status = :status', {
        status: CertificationStatus.REJECTED,
      });
    });

    it('应该不筛选状态当未指定', async () => {
      const mockQueryBuilder = certificationRepository.createQueryBuilder();
      await service.getCertifications(1, 20);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('cert.status = :status', expect.any(Object));
    });

    it('应该使用默认分页参数', async () => {
      const result = await service.getCertifications();

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('reviewCertification', () => {
    it('应该通过认证审核', async () => {
      certificationService.approve.mockResolvedValue(undefined);

      const result = await service.reviewCertification(1, CertificationStatus.APPROVED);

      expect(result).toEqual({ message: '审核完成' });
      expect(certificationService.approve).toHaveBeenCalledWith(1, 1);
    });

    it('应该拒绝认证审核', async () => {
      certificationService.reject.mockResolvedValue(undefined);

      const result = await service.reviewCertification(
        1,
        CertificationStatus.REJECTED,
        '资料不符'
      );

      expect(result).toEqual({ message: '审核完成' });
      expect(certificationService.reject).toHaveBeenCalledWith(1, 1, '资料不符');
    });

    it('应该使用默认拒绝原因', async () => {
      certificationService.reject.mockResolvedValue(undefined);

      await service.reviewCertification(1, CertificationStatus.REJECTED);

      expect(certificationService.reject).toHaveBeenCalledWith(1, 1, '审核未通过');
    });
  });

  describe('getPosts', () => {
    it('应该返回帖子列表', async () => {
      const result = await service.getPosts(1, 20);

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该支持状态筛选', async () => {
      const mockQueryBuilder = postRepository.createQueryBuilder();
      await service.getPosts(1, 20, PostStatus.NORMAL);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('post.status = :status', {
        status: PostStatus.NORMAL,
      });
    });

    it('应该支持关键词搜索', async () => {
      const mockQueryBuilder = postRepository.createQueryBuilder();
      await service.getPosts(1, 20, undefined, 'test');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('post.content LIKE :keyword', {
        keyword: '%test%',
      });
    });

    it('应该筛选违规帖子', async () => {
      const mockQueryBuilder = postRepository.createQueryBuilder();
      await service.getPosts(1, 20, PostStatus.VIOLATION);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('post.status = :status', {
        status: PostStatus.VIOLATION,
      });
    });

    it('应该同时支持状态和关键词筛选', async () => {
      const mockQueryBuilder = postRepository.createQueryBuilder();
      await service.getPosts(1, 20, PostStatus.NORMAL, 'test');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('post.status = :status', {
        status: PostStatus.NORMAL,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('post.content LIKE :keyword', {
        keyword: '%test%',
      });
    });

    it('应该忽略NaN状态值', async () => {
      const mockQueryBuilder = postRepository.createQueryBuilder();
      await service.getPosts(1, 20, NaN);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('post.status = :status', expect.any(Object));
    });

    it('应该使用默认分页参数', async () => {
      const result = await service.getPosts();

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('deletePost', () => {
    it('应该成功删除帖子', async () => {
      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.VIOLATION });

      const result = await service.deletePost(1);

      expect(result).toEqual({ message: '删除成功' });
      expect(postRepository.save).toHaveBeenCalled();
    });

    it('应该抛出异常当帖子不存在', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(service.deletePost(999)).rejects.toThrow(NotFoundException);
      await expect(service.deletePost(999)).rejects.toThrow('帖子不存在');
    });

    it('应该扣除积分', async () => {
      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.VIOLATION });
      pointsService.addPoints.mockResolvedValue(undefined);

      await service.deletePost(1, '违规内容', 50);

      expect(pointsService.addPoints).toHaveBeenCalledWith(
        1,
        -50,
        PointsSourceType.DEDUCT_VIOLATION,
        1,
        '违规内容'
      );
    });

    it('应该不扣除积分当未指定', async () => {
      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.VIOLATION });

      await service.deletePost(1);

      expect(pointsService.addPoints).not.toHaveBeenCalled();
    });

    it('应该不扣除积分当积分为0', async () => {
      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.VIOLATION });

      await service.deletePost(1, '警告', 0);

      expect(pointsService.addPoints).not.toHaveBeenCalled();
    });

    it('应该不扣除积分当积分为负数', async () => {
      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.VIOLATION });

      await service.deletePost(1, '测试', -10);

      expect(pointsService.addPoints).not.toHaveBeenCalled();
    });

    it('应该删除帖子并使用默认原因', async () => {
      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.VIOLATION });
      pointsService.addPoints.mockResolvedValue(undefined);

      await service.deletePost(1, undefined, 30);

      expect(pointsService.addPoints).toHaveBeenCalledWith(
        1,
        -30,
        PointsSourceType.DEDUCT_VIOLATION,
        1,
        undefined
      );
    });
  });

  describe('getReports', () => {
    it('应该返回举报列表', async () => {
      const result = await service.getReports(1, 20);

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该支持状态筛选', async () => {
      const mockQueryBuilder = reportRepository.createQueryBuilder();
      await service.getReports(1, 20, HandleStatus.PENDING);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('report.status = :status', {
        status: HandleStatus.PENDING,
      });
    });

    it('应该筛选已处理的举报', async () => {
      const mockQueryBuilder = reportRepository.createQueryBuilder();
      await service.getReports(1, 20, HandleStatus.HANDLED);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('report.status = :status', {
        status: HandleStatus.HANDLED,
      });
    });

    it('应该不筛选状态当未指定', async () => {
      const mockQueryBuilder = reportRepository.createQueryBuilder();
      await service.getReports(1, 20);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('report.status = :status', expect.any(Object));
    });

    it('应该使用默认分页参数', async () => {
      const result = await service.getReports();

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('handleReport', () => {
    it('应该成功处理举报', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport);
      reportRepository.save.mockResolvedValue({
        ...mockReport,
        status: HandleStatus.HANDLED,
        handledAt: new Date(),
        handledBy: 1,
      });

      const result = await service.handleReport(1, 'ignore');

      expect(result).toEqual({ message: '处理完成' });
      expect(reportRepository.save).toHaveBeenCalled();
    });

    it('应该抛出异常当举报不存在', async () => {
      reportRepository.findOne.mockResolvedValue(null);

      await expect(service.handleReport(999, 'ignore')).rejects.toThrow(NotFoundException);
      await expect(service.handleReport(999, 'ignore')).rejects.toThrow('举报不存在');
    });

    it('应该删除违规帖子', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport);
      reportRepository.save.mockResolvedValue({
        ...mockReport,
        status: HandleStatus.HANDLED,
      });
      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.VIOLATION });

      await service.handleReport(1, 'delete', 50);

      expect(postRepository.save).toHaveBeenCalled();
    });

    it('应该忽略举报不删除帖子', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport);
      reportRepository.save.mockResolvedValue({
        ...mockReport,
        status: HandleStatus.HANDLED,
      });

      await service.handleReport(1, 'ignore');

      expect(postRepository.save).not.toHaveBeenCalled();
    });

    it('应该删除帖子不扣除积分', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport);
      reportRepository.save.mockResolvedValue({
        ...mockReport,
        status: HandleStatus.HANDLED,
      });
      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.VIOLATION });

      await service.handleReport(1, 'delete');

      expect(postRepository.save).toHaveBeenCalled();
      expect(pointsService.addPoints).not.toHaveBeenCalled();
    });

    it('应该删除帖子并扣除积分', async () => {
      reportRepository.findOne.mockResolvedValue(mockReport);
      reportRepository.save.mockResolvedValue({
        ...mockReport,
        status: HandleStatus.HANDLED,
      });
      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: PostStatus.VIOLATION });
      pointsService.addPoints.mockResolvedValue(undefined);

      await service.handleReport(1, 'delete', 100);

      expect(postRepository.save).toHaveBeenCalled();
      expect(pointsService.addPoints).toHaveBeenCalledWith(
        1,
        -100,
        PointsSourceType.DEDUCT_VIOLATION,
        1,
        '违规内容'
      );
    });
  });

  describe('getConfig', () => {
    it('应该返回配置列表', async () => {
      pointsConfigService.findAll.mockResolvedValue([
        { key: 'register', value: 100 },
        { key: 'daily_signin', value: 10 },
      ]);

      const result = await service.getConfig();

      expect(result).toEqual({
        'points.register': 100,
        'points.daily_signin': 10,
      });
    });
  });

  describe('updateConfig', () => {
    it('应该成功更新配置', async () => {
      pointsConfigService.batchUpdate.mockResolvedValue(undefined);

      const config = {
        'points.register': 200,
        'points.daily_signin': 20,
      };

      const result = await service.updateConfig(config);

      expect(result).toEqual({ message: '配置更新成功' });
      expect(pointsConfigService.batchUpdate).toHaveBeenCalledWith([
        { key: 'register', value: 200 },
        { key: 'daily_signin', value: 20 },
      ]);
    });
  });

  describe('getStatistics', () => {
    it('应该返回统计数据', async () => {
      userRepository.count.mockResolvedValue(100);
      postRepository.count.mockResolvedValue(500);

      const result = await service.getStatistics();

      expect(result).toEqual({
        user: {
          total: 100,
        },
        content: {
          posts: 500,
        },
        points: {
          totalIssued: 0,
          totalConsumed: 0,
        },
      });
    });

    it('应该支持日期范围筛选', async () => {
      userRepository.count.mockResolvedValue(50);
      postRepository.count.mockResolvedValue(200);

      const result = await service.getStatistics('2024-01-01', '2024-12-31');

      expect(result).toEqual({
        user: {
          total: 50,
        },
        content: {
          posts: 200,
        },
        points: {
          totalIssued: 0,
          totalConsumed: 0,
        },
      });
    });

    it('应该处理空数据', async () => {
      userRepository.count.mockResolvedValue(0);
      postRepository.count.mockResolvedValue(0);

      const result = await service.getStatistics();

      expect(result).toEqual({
        user: {
          total: 0,
        },
        content: {
          posts: 0,
        },
        points: {
          totalIssued: 0,
          totalConsumed: 0,
        },
      });
    });
  });

  describe('login22', () => {
    it('应该调用login方法', async () => {
      const dto = {
        account: 'admin',
        password: 'admin123',
        loginType: LoginType.USERNAME,
      };
      jwtService.sign.mockReturnValue('mock_token');

      const result = await service.login22(dto);

      expect(result.token).toBe('mock_token');
      expect(result.admin.username).toBe('admin');
    });
  });

  describe('login - loginType default', () => {
    it('应该使用默认登录类型', async () => {
      const dto = {
        account: 'admin',
        password: 'admin123',
      } as any;
      jwtService.sign.mockReturnValue('mock_token');

      const result = await service.login(dto);

      expect(result.token).toBe('mock_token');
    });
  });

  describe('getConfig - edge cases', () => {
    it('应该处理空配置列表', async () => {
      pointsConfigService.findAll.mockResolvedValue([]);

      const result = await service.getConfig();

      expect(result).toEqual({});
    });

    it('应该处理多个配置项', async () => {
      pointsConfigService.findAll.mockResolvedValue([
        { key: 'register', value: 100 },
        { key: 'daily_signin', value: 10 },
        { key: 'post', value: 5 },
        { key: 'comment', value: 2 },
      ]);

      const result = await service.getConfig();

      expect(result).toEqual({
        'points.register': 100,
        'points.daily_signin': 10,
        'points.post': 5,
        'points.comment': 2,
      });
    });
  });

  describe('updateConfig - edge cases', () => {
    it('应该处理单个配置更新', async () => {
      pointsConfigService.batchUpdate.mockResolvedValue(undefined);

      const config = {
        'points.register': 150,
      };

      const result = await service.updateConfig(config);

      expect(result).toEqual({ message: '配置更新成功' });
      expect(pointsConfigService.batchUpdate).toHaveBeenCalledWith([
        { key: 'register', value: 150 },
      ]);
    });

    it('应该处理多个配置更新', async () => {
      pointsConfigService.batchUpdate.mockResolvedValue(undefined);

      const config = {
        'points.register': 200,
        'points.daily_signin': 20,
        'points.post': 10,
      };

      const result = await service.updateConfig(config);

      expect(result).toEqual({ message: '配置更新成功' });
      expect(pointsConfigService.batchUpdate).toHaveBeenCalledWith([
        { key: 'register', value: 200 },
        { key: 'daily_signin', value: 20 },
        { key: 'post', value: 10 },
      ]);
    });

    it('应该处理空配置对象', async () => {
      pointsConfigService.batchUpdate.mockResolvedValue(undefined);

      const config = {};

      const result = await service.updateConfig(config);

      expect(result).toEqual({ message: '配置更新成功' });
      expect(pointsConfigService.batchUpdate).toHaveBeenCalledWith([]);
    });
  });
});
