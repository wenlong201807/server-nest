import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../../modules/user/user.service';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockUserService: any;
  let mockConfigService: any;

  const mockUser = {
    id: 1,
    mobile: '13800138000',
    nickname: 'Test User',
    status: 0,
  };

  beforeEach(async () => {
    mockUserService = {
      findById: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test_secret_key';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该使用默认密钥当 JWT_SECRET 未配置', async () => {
      const mockConfigServiceWithoutSecret = {
        get: jest.fn(() => null),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: UserService,
            useValue: mockUserService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigServiceWithoutSecret,
          },
        ],
      }).compile();

      const strategyInstance = module.get<JwtStrategy>(JwtStrategy);
      expect(strategyInstance).toBeDefined();
      expect(mockConfigServiceWithoutSecret.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('validate', () => {
    it('应该验证管理员 token', async () => {
      const payload = {
        sub: 1,
        username: 'admin',
        mobile: '13800138000',
        role: 'admin',
        type: 'admin',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: 1,
        username: 'admin',
        mobile: '13800138000',
        role: 'admin',
        type: 'admin',
      });
      expect(mockUserService.findById).not.toHaveBeenCalled();
    });

    it('应该验证普通用户 token', async () => {
      const payload = {
        sub: 1,
        mobile: '13800138000',
      };

      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: 1,
        mobile: '13800138000',
        nickname: 'Test User',
      });
      expect(mockUserService.findById).toHaveBeenCalledWith(1);
    });

    it('应该抛出异常当用户不存在', async () => {
      const payload = {
        sub: 999,
        mobile: '13800138000',
      };

      mockUserService.findById.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('用户不存在');
    });

    it('应该抛出异常当用户被禁用', async () => {
      const payload = {
        sub: 1,
        mobile: '13800138000',
      };

      const disabledUser = { ...mockUser, status: 1 };
      mockUserService.findById.mockResolvedValue(disabledUser);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('账号已被禁用');
    });
  });
});
