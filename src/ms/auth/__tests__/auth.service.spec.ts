import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { PointsService } from '../../points/points.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../common/redis/redis.service';
import { UnauthorizedException } from '@nestjs/common';
import { PasswordUtil } from '../../../common/utils/password.util';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let pointsService: jest.Mocked<PointsService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUser = {
    id: 1,
    mobile: '13800138000',
    password: 'hashed_password',
    nickname: 'Test User',
    gender: 1,
    points: 2000,
    inviteCode: 'ABC12345',
    status: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByMobile: jest.fn(),
            findByInviteCode: jest.fn(),
            findById: jest.fn(),
            createWithTransaction: jest.fn(),
          },
        },
        {
          provide: PointsService,
          useValue: {
            addPoints: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRES_IN: '7d',
                JWT_REFRESH_EXPIRES_IN: '30d',
                NODE_ENV: 'test',
              };
              return config[key];
            }),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getJson: jest.fn(),
            setJson: jest.fn(),
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    pointsService = module.get(PointsService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    redisService = module.get(RedisService);
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
      expect(redisService.set).toHaveBeenCalled();
    });

    it('应该拒绝频繁发送', async () => {
      redisService.get.mockResolvedValue('1');

      await expect(service.sendSms('13800138000')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      mobile: '13800138000',
      password: 'test123456',
      code: '123456',
      nickname: 'Test User',
      gender: 1,
    };

 it('应该成功注册新用户', async () => {
      redisService.getJson.mockResolvedValue({
        code: '123456',
        createdAt: Date.now(),
      });
      userService.findByMobile.mockResolvedValue(null);
      userService.createWithTransaction.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('mock-token');
      redisService.del.mockResolvedValue(1);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(userService.createWithTransaction).toHaveBeenCalled();
    });

    it('应该拒绝已注册的手机号', async () => {
      redisService.getJson.mockResolvedValue({
        code: '123456',
        createdAt: Date.now(),
      });
      userService.findByMobile.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        '手机号已注册'
      );
    });

    it('应该拒绝错误的验证码', async () => {
      redisService.getJson.mockResolvedValue({
        code: '654321',
        createdAt: Date.now(),
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        '验证码错误'
      );
    });

    it('应该拒绝过期的验证码', async () => {
      redisService.getJson.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        '验证码已过期'
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      mobile: '13800138000',
      password: 'test123456',
    };

    it('应该成功登录', async () => {
      userService.findByMobile.mockResolvedValue(mockUser as any);
      jest.spyOn(PasswordUtil, 'compare').mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('应该拒绝不存在的用户', async () => {
      userService.findByMobile.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow('用户不存在');
    });

    it('应该拒绝错误的密码', async () => {
      userService.findByMobile.mockResolvedValue(mockUser as any);
      jest.spyOn(PasswordUtil, 'compare').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow('密码错误');
    });

    it('应该拒绝被禁用的账号', async () => {
      const bannedUser = { ...mockUser, status: 1 };
      userService.findByMobile.mockResolvedValue(bannedUser as any);

      await expect(service.login(loginDto)).rejects.toThrow('账号已被禁用');
    });
  });

  describe('refreshToken', () => {
    it('应该成功刷新 Token', async () => {
      const payload = { sub: 1, mobile: '13800138000', nickname: 'Test User' };
      jwtService.verify.mockReturnValue(payload);
      redisService.exists.mockResolvedValue(false);
      userService.findById.mlvedValue(mockUser as any);
      jwtService.s.mockReturnValue('new-token');

      const result = await service.refreshToken('old-refresh-token');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('应该拒绝黑名单中的 Token', async () => {
      const payload = { sub: 1, mobile: '13800138000', nickname: 'Test User' };
      jwtService.verify.mockReturnValue(payload);
      redisService.exists.mockResolvedValue(true);

      await expect(service.refreshToken('blacklisted-token')).rejects.toThrow(
        'Token 已失效'
      );
    });

    it('应该拒绝无效的 Token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Token 无效或已过期'
      );
    });

    it('应该拒绝不存在的用户', async () => {
      const payload = { sub: 999, mobile: '13800138000', nickname: 'Test User' };
      jwtService.verify.mockReturnValue(payload);
      redisService.exists.mockResolvedValue(false);
      userService.findById.mockResolvedValue(null);

      await expect(service.refreshToken('valid-token')).rejects.toThrow(
        '用户不存在'
      );
    });
  });

  describe('logout', () => {
    it('应该成功登出', async () => {
      const payload = { sub: 1, exp: Math.floor(Date.now() / 1000) + 3600 };
      jwtService.decode.mockReturnValue(payload);
      redisService.set.mockResolvedValue(undefined);

      const result = await service.logout('valid-token');

      expect(result).toEqual({ message: '退出成功' });
      expect(redisService.set).toHaveBeenCalled();
    });

    it('应该处理已过期的 Token', async () => {
      const payload = { sub: 1, exp: Math.floor(Date.now() / 1000) - 3600 };
      jwtService.decode.mockReturnValue(payload);

      const result = await service.logout('expired-token');

      expect(result).toEqual({ message: '退出成功' });
      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('应该处理无效的 Token', async () => {
      jwtService.decode.mockReturnValue(null);

      const result = await service.logout('invalid-token');

      expect(result).toEqual({ message: '退出成功' });
    });
  });

  describe('generateToken', () => {
    it('应该生成 access token 和 refresh token', async () => {
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await (service as any).generoken(mockUser);

      expect(result).toHaveProperty('token', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('应该排除密码字段', async () => {
      jwtService.sign.mockReturnValue('mock-token');

      const result = await (service as any).generateToken(mockUser);

      expect(result.user).not.toHaveProperty('password');
    });
  });
});
