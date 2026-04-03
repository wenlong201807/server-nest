import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { PointsService } from '../../points/points.service';
import { RedisService } from '../../../common/redis/redis.service';
import { UnauthorizedException } from '@nestjs/common';
import { PointsSourceType } from '@common/constants';

describe('AuthService', () => {
  let service: AuthService;
  let userService: any;
  let pointsService: any;
  let jwtService: any;
  let configService: any;
  let redisService: any;

  const mockUser = {
    id: 1,
    mobile: '13800138000',
    password: '6fbc75bc0825476f8cb3841ad8236d4f.1c156a7f9d12ef81013adb3e39454f974d9af111b56daab305dc52eed9a747b50164ad3aa1543d417174cdd72e271c6d3dcac507f425e5cbc4e4f822cc1fa2ef',
    nickname: 'User 1',
    points: 2000,
    inviteCode: 'ABC12345',
    status: 0,
  };

  beforeEach(async () => {
    userService = {
      findByMobile: jest.fn(),
      findByInviteCode: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      createWithTransaction: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    pointsService = {
      addPoints: jest.fn(),
    };

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    configService = {
      get: jest.fn((key) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'JWT_SECRET') return 'test_secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret';
        return null;
      }),
    };

    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      setJson: jest.fn(),
      getJson: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: PointsService,
          useValue: pointsService,
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

    service = module.get<AuthService>(AuthService);
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
      expect(redisService.set).toHaveBeenCalledWith('sms:rate:13800138000', '1', 60);
    });

    it('应该拒绝频繁发送', async () => {
      redisService.get.mockResolvedValue('1');

      await expect(service.sendSms('13800138000')).rejects.toThrow(UnauthorizedException);
      await expect(service.sendSms('13800138000')).rejects.toThrow('发送过于频繁');
    });
  });

  describe('register', () => {
    it('应该成功注册用户', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
        code: '123456',
        nickname: 'NewUser',
      };
      redisService.getJson.mockResolvedValue({ code: '123456', createdAt: Date.now() });
      userService.findByMobile.mockResolvedValue(null);
      userService.findByInviteCode.mockResolvedValue(null);
      userService.createWithTransaction.mockResolvedValue({ ...mockUser, id: 1 });
      jwtService.sign.mockReturnValue('mock_token');
      redisService.del.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(result.user).toBeDefined();
      expect(result.token).toBe('mock_token');
      expect(result.refreshToken).toBe('mock_token');
    });

    it('应该拒绝错误的验证码', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
        code: '999999',
        nickname: 'NewUser',
      };
      redisService.getJson.mockResolvedValue({ code: '123456', createdAt: Date.now() });

      await expect(service.register(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.register(dto)).rejects.toThrow('验证码错误');
    });

    it('应该拒绝已注册的手机号', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
        code: '123456',
        nickname: 'NewUser',
      };
      redisService.getJson.mockResolvedValue({ code: '123456', createdAt: Date.now() });
      userService.findByMobile.mockResolvedValue(mockUser);

      await expect(service.register(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.register(dto)).rejects.toThrow('手机号已注册');
    });

    it('应该拒绝过期的验证码', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
        code: '123456',
        nickname: 'NewUser',
      };
      redisService.getJson.mockResolvedValue(null);

      await expect(service.register(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.register(dto)).rejects.toThrow('验证码已过期');
    });
  });

  describe('login', () => {
    it('应该成功登录', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
      };
      userService.findByMobile.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock_token');

      const result = await service.login(dto);

      expect(result.user).toBeDefined();
      expect(result.token).toBe('mock_token');
      expect(result.refreshToken).toBe('mock_token');
    });

    it('应该拒绝不存在的用户', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
      };
      userService.findByMobile.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('用户不存在');
    });

    it('应该拒绝错误的密码', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'wrong_password',
      };
      userService.findByMobile.mockResolvedValue(mockUser);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('密码错误');
    });

    it('应该拒绝被禁用的用户', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
      };
      userService.findByMobile.mockResolvedValue({ ...mockUser, status: 1 });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('账号已被禁用');
    });
  });

  describe('refreshToken', () => {
    it('应该成功刷新 token', async () => {
      const refreshToken = 'valid_refresh_token';
      jwtService.verify.mockReturnValue({ sub: 1 });
      redisService.exists.mockResolvedValue(false);
      userService.findById.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('new_token');

      const result = await service.refreshToken(refreshToken);

      expect(result.token).toBe('new_token');
      expect(result.refreshToken).toBe('new_token');
    });

    it('应该拒绝无效的 token', async () => {
      const refreshToken = 'invalid_token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(refreshToken)).rejects.toThrow('Token 无效或已过期');
    });
  });

  describe('logout', () => {
    it('应该成功登出', async () => {
      const token = 'valid_token';
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      redisService.set.mockResolvedValue(undefined);

      const result = await service.logout(token);

      expect(result).toEqual({ message: '退出成功' });
      expect(redisService.set).toHaveBeenCalled();
    });

    it('应该处理无效的 token', async () => {
      const token = 'invalid_token';
      jwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.logout(token);

      expect(result).toEqual({ message: '退出成功' });
    });
  });

  describe('边界测试', () => {
    it('应该处理邀请码冲突', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
        code: '123456',
        nickname: 'NewUser',
      };
      redisService.getJson.mockResolvedValue({ code: '123456', createdAt: Date.now() });
      userService.findByMobile.mockResolvedValue(null);
      userService.findByInviteCode
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce(null);
      userService.createWithTransaction.mockResolvedValue({ ...mockUser, id: 1 });
      jwtService.sign.mockReturnValue('mock_token');
      redisService.del.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(result.user).toBeDefined();
      expect(userService.findByInviteCode).toHaveBeenCalledTimes(2);
    });

    it('应该处理邀请人注册', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
        code: '123456',
        nickname: 'NewUser',
        inviterCode: 'INVITER123',
      };
      const inviter = { ...mockUser, id: 2, inviteCode: 'INVITER123' };
      redisService.getJson.mockResolvedValue({ code: '123456', createdAt: Date.now() });
      userService.findByMobile.mockResolvedValue(null);
      userService.findByInviteCode
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(inviter);
      userService.createWithTransaction.mockResolvedValue({ ...mockUser, id: 1 });
      jwtService.sign.mockReturnValue('mock_token');
      redisService.del.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(result.user).toBeDefined();
    });
  });

  describe('sendSms - 生产环境分支', () => {
    it('应该在生产环境记录警告', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'JWT_SECRET') return 'test_secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret';
        return null;
      });
      redisService.get.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);
      redisService.set.mockResolvedValue(undefined);

      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      const result = await service.sendSms('13800138000');

      expect(result).toEqual({ message: '验证码已发送' });
      expect(loggerSpy).toHaveBeenCalledWith('生产环境短信服务未配置');
    });
  });

  describe('refreshToken - 额外分支', () => {
    it('应该拒绝黑名单中的 token', async () => {
      const refreshToken = 'blacklisted_token';
      jwtService.verify.mockReturnValue({ sub: 1 });
      redisService.exists.mockResolvedValue(true);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(refreshToken)).rejects.toThrow('Token 无效或已过期');
    });

    it('应该拒绝不存在的用户', async () => {
      const refreshToken = 'valid_token';
      jwtService.verify.mockReturnValue({ sub: 999 });
      redisService.exists.mockResolvedValue(false);
      userService.findById.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(refreshToken)).rejects.toThrow('Token 无效或已过期');
    });

    it('应该拒绝被禁用用户的 token', async () => {
      const refreshToken = 'valid_token';
      jwtService.verify.mockReturnValue({ sub: 1 });
      redisService.exists.mockResolvedValue(false);
      userService.findById.mockResolvedValue({ ...mockUser, status: 1 });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(refreshToken)).rejects.toThrow('Token 无效或已过期');
    });

    it('应该使用 JWT_SECRET 作为 fallback', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'JWT_SECRET') return 'test_secret';
        if (key === 'JWT_REFRESH_SECRET') return null;
        return null;
      });
      const refreshToken = 'valid_refresh_token';
      jwtService.verify.mockReturnValue({ sub: 1 });
      redisService.exists.mockResolvedValue(false);
      userService.findById.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('new_token');

      const result = await service.refreshToken(refreshToken);

      expect(result.token).toBe('new_token');
      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test_secret',
      });
    });
  });

  describe('logout - 额外分支', () => {
    it('应该跳过已过期的 token', async () => {
      const token = 'expired_token';
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 3600 });

      const result = await service.logout(token);

      expect(result).toEqual({ message: '退出成功' });
      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('应该处理 token 过期时间为 0 的情况', async () => {
      const token = 'zero_exp_token';
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) });

      const result = await service.logout(token);

      expect(result).toEqual({ message: '退出成功' });
      expect(redisService.set).not.toHaveBeenCalled();
    });
  });

  describe('generateToken - 配置 fallback', () => {
    it('应该使用默认过期时间', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'JWT_SECRET') return 'test_secret';
        if (key === 'JWT_REFRESH_SECRET') return null;
        if (key === 'JWT_EXPIRES_IN') return null;
        if (key === 'JWT_REFRESH_EXPIRES_IN') return null;
        return null;
      });
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
      };
      userService.findByMobile.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock_token');

      const result = await service.login(dto);

      expect(result.token).toBe('mock_token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: '7d',
        })
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: '30d',
        })
      );
    });
  });
});
