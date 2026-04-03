import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(async () => {
    authService = {
      sendSms: jest.fn(),
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSms', () => {
    it('应该调用 authService.sendSms', async () => {
      const dto = { mobile: '13800138000' };
      authService.sendSms.mockResolvedValue({ message: '验证码已发送' });

      const result = await controller.sendSms(dto);

      expect(result).toEqual({ message: '验证码已发送' });
      expect(authService.sendSms).toHaveBeenCalledWith('13800138000');
    });
  });

  describe('register', () => {
    it('应该调用 authService.register', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
        code: '123456',
        nickname: 'TestUser',
      };
      const mockResult = {
        user: { id: 1, mobile: '13800138000' },
        token: 'mock_token',
        refreshToken: 'mock_refresh_token',
      };
      authService.register.mockResolvedValue(mockResult);

      const result = await controller.register(dto);

      expect(result).toEqual(mockResult);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('应该调用 authService.login', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'test123456',
      };
      const mockResult = {
        user: { id: 1, mobile: '13800138000' },
        token: 'mock_token',
        refreshToken: 'mock_refresh_token',
      };
      authService.login.mockResolvedValue(mockResult);

      const result = await controller.login(dto);

      expect(result).toEqual(mockResult);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('应该调用 authService.refreshToken', async () => {
      const refreshToken = 'mock_refresh_token';
      const mockResult = {
        token: 'new_token',
        refreshToken: 'new_refresh_token',
      };
      authService.refreshToken.mockResolvedValue(mockResult);

      const result = await controller.refresh(refreshToken);

      expect(result).toEqual(mockResult);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshToken);
    });
  });
});
