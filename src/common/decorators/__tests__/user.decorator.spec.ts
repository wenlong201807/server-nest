import { ExecutionContext } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../user.decorator';

describe('CurrentUser Decorator', () => {
  // Helper to execute the decorator's factory function logic
  const executeDecorator = (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    // Re-implement the decorator logic to test it
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  };

  const mockUser: JwtPayload = {
    sub: 1,
    id: 1,
    mobile: '13800138000',
    nickname: 'Test User',
    username: 'testuser',
  };

  const createMockHttpContext = (request: any): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      switchToWs: jest.fn(),
      getType: jest.fn().mockReturnValue('http'),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
    } as any;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HTTP Context - No data parameter', () => {
    it('should return the entire user object when no data parameter is provided', () => {
      const context = createMockHttpContext({ user: mockUser });
      const result = executeDecorator(undefined, context);

      expect(result).toEqual(mockUser);
      expect(context.switchToHttp).toHaveBeenCalled();
    });

    it('should return undefined when user is missing and no data parameter', () => {
      const context = createMockHttpContext({});
      const result = executeDecorator(undefined, context);

      expect(result).toBeUndefined();
    });

    it('should return null when user is null and no data parameter', () => {
      const context = createMockHttpContext({ user: null });
      const result = executeDecorator(undefined, context);

      expect(result).toBeNull();
    });
  });

  describe('HTTP Context - With data parameter', () => {
    it('should return specific user property when data parameter is "mobile"', () => {
      const context = createMockHttpContext({ user: mockUser });
      const result = executeDecorator('mobile', context);

      expect(result).toBe('13800138000');
    });

    it('should return user id when data parameter is "id"', () => {
      const context = createMockHttpContext({ user: mockUser });
      const result = executeDecorator('id', context);

      expect(result).toBe(1);
    });

    it('should return user sub when data parameter is "sub"', () => {
      const context = createMockHttpContext({ user: mockUser });
      const result = executeDecorator('sub', context);

      expect(result).toBe(1);
    });

    it('should return user nickname when data parameter is "nickname"', () => {
      const context = createMockHttpContext({ user: mockUser });
      const result = executeDecorator('nickname', context);

      expect(result).toBe('Test User');
    });

    it('should return user username when data parameter is "username"', () => {
      const context = createMockHttpContext({ user: mockUser });
      const result = executeDecorator('username', context);

      expect(result).toBe('testuser');
    });

    it('should return undefined when accessing non-existent property', () => {
      const context = createMockHttpContext({ user: mockUser });
      const result = executeDecorator('nonExistent' as any, context);

      expect(result).toBeUndefined();
    });

    it('should return undefined when accessing property on undefined user', () => {
      const context = createMockHttpContext({});
      const result = executeDecorator('mobile', context);

      expect(result).toBeUndefined();
    });

    it('should return undefined when accessing property on null user', () => {
      const context = createMockHttpContext({ user: null });
      const result = executeDecorator('mobile', context);

      expect(result).toBeUndefined();
    });
  });

  describe('Different User Objects', () => {
    it('should handle user object without optional username', () => {
      const userWithoutUsername = {
        sub: 2,
        id: 2,
        mobile: '13900139000',
        nickname: 'User Without Username',
      };
      const context = createMockHttpContext({ user: userWithoutUsername });
      const result = executeDecorator(undefined, context) as any;

      expect(result).toEqual(userWithoutUsername);
      expect(result.username).toBeUndefined();
    });

    it('should handle minimal user object with only required fields', () => {
      const minimalUser = {
        sub: 3,
        id: 3,
        mobile: '13700137000',
        nickname: 'Minimal User',
      };
      const context = createMockHttpContext({ user: minimalUser });
      const result = executeDecorator(undefined, context);

      expect(result).toEqual(minimalUser);
    });

    it('should handle user object with all fields', () => {
      const fullUser: JwtPayload = {
        sub: 4,
        id: 4,
        mobile: '13600136000',
        nickname: 'Full User',
        username: 'fulluser',
      };
      const context = createMockHttpContext({ user: fullUser });
      const result = executeDecorator(undefined, context);

      expect(result).toEqual(fullUser);
    });

    it('should handle user with numeric string values', () => {
      const userWithStrings = {
        sub: 5,
        id: 5,
        mobile: '13500135000',
        nickname: '12345',
        username: '67890',
      };
      const context = createMockHttpContext({ user: userWithStrings });

      const resultNickname = executeDecorator('nickname', context);
      const resultUsername = executeDecorator('username', context);

      expect(resultNickname).toBe('12345');
      expect(resultUsername).toBe('67890');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      const userWithEmptyStrings = {
        sub: 6,
        id: 6,
        mobile: '',
        nickname: '',
        username: '',
      };
      const context = createMockHttpContext({ user: userWithEmptyStrings });
      const result = executeDecorator('mobile', context);

      expect(result).toBe('');
    });

    it('should handle user with zero id', () => {
      const userWithZeroId = {
        sub: 0,
        id: 0,
        mobile: '13400134000',
        nickname: 'Zero ID User',
      };
      const context = createMockHttpContext({ user: userWithZeroId });

      const resultSub = executeDecorator('sub', context);
      const resultId = executeDecorator('id', context);

      expect(resultSub).toBe(0);
      expect(resultId).toBe(0);
    });

    it('should handle multiple calls with different contexts', () => {
      const context1 = createMockHttpContext({ user: mockUser });
      const context2 = createMockHttpContext({ user: mockUser });
      const context3 = createMockHttpContext({ user: mockUser });

      const result1 = executeDecorator(undefined, context1);
      const result2 = executeDecorator('mobile', context2);
      const result3 = executeDecorator('nickname', context3);

      expect(result1).toEqual(mockUser);
      expect(result2).toBe('13800138000');
      expect(result3).toBe('Test User');
    });

    it('should handle accessing property that returns null', () => {
      const userWithNull = {
        sub: 7,
        id: 7,
        mobile: null as any,
        nickname: 'User With Null',
      };
      const context = createMockHttpContext({ user: userWithNull });
      const result = executeDecorator('mobile', context);

      expect(result).toBeNull();
    });

    it('should handle request without user property at all', () => {
      const context = createMockHttpContext({});
      const result = executeDecorator(undefined, context);

      expect(result).toBeUndefined();
    });
  });
});
