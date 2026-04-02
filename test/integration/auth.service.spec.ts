import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UserService } from '../../src/modules/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { PasswordUtil } from '../../src/common/utils/password.util';

describe('AuthService (Integration)', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    mobile: '13800000001',
    password: 'hashedPassword',
    nickname: '测试用户',
    points: 2000,
    status: 0,
  };

  const mockUserService = {
    findByMobile: jest.fn(),
    create: jest.fn(),
    findByInviteCode: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user data when credentials are valid', async () => {
      const hashedPassword = await PasswordUtil.hash('Test123456');
      mockUserService.findByMobile.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.validateUser('13800000001', 'Test123456');

      expect(result).toBeDefined();
      expect(result.mobile).toBe('13800000001');
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found', async () => {
      mockUserService.findByMobile.mockResolvedValue(null);

      const result = await service.validateUser('19999999999', 'Test123456');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const hashedPassword = await PasswordUtil.hash('Test123456');
      mockUserService.findByMobile.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.validateUser('13800000001', 'WrongPassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user data', async () => {
      const mockToken = 'mock.jwt.token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(mockUser as any);

      expect(result).toHaveProperty('access_token', mockToken);
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual(mockUser);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        mobile: mockUser.mobile,
      });
    });
  });

  describe('register', () => {
    const registerDto = {
      mobile: '13900000001',
      password: 'Test123456',
      nickname: '新用户',
      gender: 1,
      inviteCode: 'NEW001',
      inviterCode: 'INVITE001',
    };

    it('should register a new user successfully', async () => {
      mockUserService.findByMobile.mockResolvedValue(null);
      mockUserService.findByInviteCode.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue({
        id: 2,
        ...registerDto,
        password: 'hashedPassword',
        points: 2000,
      });

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.mobile).toBe(registerDto.mobile);
      expect(mockUserService.create).toHaveBeenCalled();
    });

    it('should throw error when mobile already exists', async () => {
      mockUserService.findByMobile.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow();
    });

    it('should throw error when invite code already exists', async () => {
      mockUserService.findByMobile.mockResolvedValue(null);
      mockUserService.findByInviteCode.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow();
    });
  });
});
