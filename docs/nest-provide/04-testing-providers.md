# NestJS Provider 测试指南

## 单元测试基础

### 测试模块设置

使用 `@nestjs/testing` 包创建测试模块。

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FriendService } from './friend.service';
import { Friendship } from './entities/friendship.entity';

describe('FriendService', () => {
  let service: FriendService;
  let mockRepository: any;

  beforeEach(async () => {
    // 创建测试模块
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendService,
        {
          provide: getRepositoryToken(Friendship),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FriendService>(FriendService);
    mockRepository = module.get(getRepositoryToken(Friendship));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Mock Provider

### 1. Mock Repository

```typescript
describe('FriendService', () => {
  let service: FriendService;
  let friendshipRepository: jest.Mocked<Repository<Friendship>>;
  let userService: jest.Mocked<UserService>;
  let pointsService: jest.Mocked<PointsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FriendService,
        {
          provide: getRepositoryToken(Friendship),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: PointsService,
          useValue: {
            addPoints: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FriendService>(FriendService);
    friendshipRepository = module.get(getRepositoryToken(Friendship));
    userService = module.get(UserService);
    pointsService = module.get(PointsService);
  });

  describe('follow', () => {
    it('should create friendship when not exists', async () => {
      const userId = 1;
      const targetId = 2;

      friendshipRepository.findOne.mockResolvedValue(null);
      friendshipRepository.create.mockReturnValue({
        userId,
        friendId: targetId,
        status: FriendStatus.FOLLOWING,
      } as Friendship);
      friendshipRepository.save.mockResolvedValue({
        id: 1,
        userId,
        friendId: targetId,
        status: FriendStatus.FOLLOWING,
      } as Friendship);

      const result = await service.follow(userId, targetId);

      expect(friendshipRepository.findOne).toHaveBeenCalledWith({
        where: { userId, friendId: targetId },
      });
      expect(friendshipRepository.create).toHaveBeenCalled();
      expect(friendshipRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(FriendStatus.FOLLOWING);
    });

    it('should throw error when following self', async () => {
      await expect(service.follow(1, 1)).rejects.toThrow('不能添加自己');
    });

    it('should throw error when relationship exists', async () => {
      friendshipRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 1,
        friendId: 2,
      } as Friendship);

      await expect(service.follow(1, 2)).rejects.toThrow('关系已存在');
    });
  });

  describe('unlockChat', () => {
    it('should unlock chat when conditions met', async () => {
      const userId = 1;
      const targetId = 2;
      const mockUser = { id: userId, points: 100 };
      const mockFriendship = {
        userId,
        friendId: targetId,
        status: FriendStatus.FOLLOWING,
        chatCount: 8,
      };

      userService.findById.mockResolvedValue(mockUser as any);
      friendshipRepository.findOne.mockResolvedValue(mockFriendship as any);
      friendshipRepository.save.mockResolvedValue({
        ...mockFriendship,
        status: FriendStatus.FRIEND,
      } as any);

      const result = await service.unlockChat(userId, targetId);

      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(pointsService.addPoints).toHaveBeenCalledWith(
        userId,
        -50,
        PointsSourceType.UNLOCK_CHAT,
        targetId,
        '解锁私聊',
      );
      expect(result.unlocked).toBe(true);
      expect(result.pointsConsumed).toBe(50);
    });

    it('should throw error when points insufficient', async () => {
      const mockUser = { id: 1, points: 30 };
      const mockFriendship = {
        userId: 1,
        friendId: 2,
        status: FriendStatus.FOLLOWING,
        chatCount: 8,
      };

      userService.findById.mockResolvedValue(mockUser as any);
      friendshipRepository.findOne.mockResolvedValue(mockFriendship as any);

      await expect(service.unlockChat(1, 2)).rejects.toThrow('积分不足');
    });
  });
});
```

### 2. Mock Service

```typescript
describe('FriendController', () => {
  let controller: FriendController;
  let service: jest.Mocked<FriendService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [FriendController],
      providers: [
        {
          provide: FriendService,
          useValue: {
            getFriendList: jest.fn(),
            follow: jest.fn(),
            unlockChat: jest.fn(),
            deleteFriend: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FriendController>(FriendController);
    service = module.get(FriendService);
  });

  describe('follow', () => {
    it('should call service.follow', async () => {
      const userId = 1;
      const targetId = 2;
      const expectedResult = { id: 1, userId, friendId: targetId };

      service.follow.mockResolvedValue(expectedResult as any);

      const result = await controller.follow(userId, targetId);

      expect(service.follow).toHaveBeenCalledWith(userId, targetId);
      expect(result).toEqual(expectedResult);
    });
  });
});
```

## 集成测试

### 测试完整模块

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendModule } from './friend.module';
import { FriendService } from './friend.service';

describe('FriendModule Integration', () => {
  let module: TestingModule;
  let service: FriendService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
        FriendModule,
      ],
    }).compile();

    service = module.get<FriendService>(FriendService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should create and retrieve friendship', async () => {
    const friendship = await service.follow(1, 2);
    expect(friendship).toBeDefined();
    expect(friendship.userId).toBe(1);
    expect(friendship.friendId).toBe(2);

    const list = await service.getFollowingList(1);
    expect(list).toHaveLength(1);
  });
});
```

## 测试异步 Provider

### 测试 useFactory

```typescript
describe('RedisModule', () => {
  let module: TestingModule;
  let redisService: RedisService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [
        {
          provide: 'REDIS_OPTIONS',
          useFactory: (configService: ConfigService) => ({
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          }),
          inject: [ConfigService],
        },
        RedisService,
      ],
    }).compile();

    redisService = module.get<RedisService>(RedisService);
  });

  it('should initialize with config', () => {
    expect(redisService).toBeDefined();
  });
});
```

## 测试 Guard 和 Interceptor

### 测试 JWT Guard

```typescript
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should allow access with valid token', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: 'Bearer valid-token',
          },
        }),
      }),
    } as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('should deny access without token', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow();
  });
});
```

## 测试自定义装饰器

```typescript
import { CurrentUser } from './user.decorator';
import { ExecutionContext } from '@nestjs/common';

describe('CurrentUser Decorator', () => {
  it('should extract user from request', () => {
    const mockUser = { id: 1, username: 'test' };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
        }),
      }),
    } as ExecutionContext;

    const result = CurrentUser('id')(null, mockContext);
    expect(result).toBe(1);
  });
});
```

## E2E 测试

### 端到端测试设置

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('FriendController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 获取认证 token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'test', password: 'test123' });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/friend/follow (POST)', () => {
    it('should follow user', () => {
      return request(app.getHttpServer())
        .post('/friend/follow')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: 2 })
        .expect(201)
        .expect((res) => {
          expect(res.body.userId).toBe(1);
          expect(res.body.friendId).toBe(2);
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/friend/follow')
        .send({ userId: 2 })
        .expect(401);
    });
  });

  describe('/friend/list (GET)', () => {
    it('should return friend list', () => {
      return request(app.getHttpServer())
        .get('/friend/list')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
```

## 测试覆盖率

### 配置 Jest

```json
// package.json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s",
      "!**/*.spec.ts",
      "!**/node_modules/**"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行单个文件
npm test -- friend.service.spec.ts

# 生成覆盖率报告
npm test -- --coverage

# 监听模式
npm test -- --watch
```

## 测试最佳实践

### 1. 使用 describe 分组

```typescript
describe('FriendService', () => {
  describe('follow', () => {
    it('should create friendship', () => {});
    it('should throw error when following self', () => {});
  });

  describe('unlockChat', () => {
    it('should unlock when conditions met', () => {});
    it('should throw error when points insufficient', () => {});
  });
});
```

### 2. 使用 beforeEach 清理状态

```typescript
describe('FriendService', () => {
  let service: FriendService;

  beforeEach(async () => {
    // 每个测试前重新创建
    const module = await Test.createTestingModule({
      providers: [FriendService],
    }).compile();

    service = module.get<FriendService>(FriendService);
  });

  afterEach(() => {
    // 清理
    jest.clearAllMocks();
  });
});
```

### 3. 测试边界条件

```typescript
describe('follow', () => {
  it('should handle null userId', async () => {
    await expect(service.follow(null, 2)).rejects.toThrow();
  });

  it('should handle negative userId', async () => {
    await expect(service.follow(-1, 2)).rejects.toThrow();
  });

  it('should handle same userId and targetId', async () => {
    await expect(service.follow(1, 1)).rejects.toThrow('不能添加自己');
  });
});
```

### 4. 使用测试工厂

```typescript
// test/factories/user.factory.ts
export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      id: 1,
      username: 'test',
      email: 'test@example.com',
      points: 100,
      ...overrides,
    } as User;
  }

  static createMany(count: number): User[] {
    return Array.from({ length: count }, (_, i) => 
      this.create({ id: i + 1 })
    );
  }
}

// 使用
it('should process user', () => {
  const user = UserFactory.create({ points: 50 });
  expect(service.process(user)).toBeDefined();
});
```

### 5. Mock 外部依赖

```typescript
describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: any;

  beforeEach(() => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      on: jest.fn(),
    };

    // Mock ioredis
    jest.mock('ioredis', () => {
      return jest.fn().mockImplementation(() => mockRedisClient);
    });

    service = new RedisService();
  });

  it('should get value from redis', async () => {
    mockRedisClient.get.mockResolvedValue('value');
    
    const result = await service.get('key');
    
    expect(mockRedisClient.get).toHaveBeenCalledWith('key');
    expect(result).toBe('value');
  });
});
```

## 常见测试场景

### 测试异常处理

```typescript
it('should handle database errors', async () => {
  friendshipRepository.save.mockRejectedValue(new Error('Database error'));

  await expect(service.follow(1, 2)).rejects.toThrow('Database error');
});
```

### 测试异步操作

```typescript
it('should wait for async operations', async () => {
  const promise = service.asyncOperation();
  
  // 等待异步操作完成
  await expect(promise).resolves.toBeDefined();
});
```

### 测试定时器

```typescript
it('should execute after timeout', () => {
  jest.useFakeTimers();
  
  const callback = jest.fn();
  service.scheduleTask(callback, 1000);
  
  jest.advanceTimersByTime(1000);
  
  expect(callback).toHaveBeenCalled();
  
  jest.useRealTimers();
});
```

## 调试测试

```typescript
// 使用 console.log
it('should debug', () => {
  console.log('Debug info:', service);
  expect(service).toBeDefined();
});

// 使用 debugger
it('should debug with breakpoint', () => {
  debugger; // 在 VS Code 中设置断点
  expect(service).toBeDefined();
});

// 只运行特定测试
it.only('should run only this test', () => {
  expect(true).toBe(true);
});

// 跳过测试
it.skip('should skip this test', () => {
  expect(true).toBe(true);
});
```

## 总结

1. **单元测试**：测试单个 Provider 的功能
2. **集成测试**：测试多个 Provider 的协作
3. **E2E 测试**：测试完整的请求流程
4. **Mock 依赖**：隔离测试目标
5. **测试覆盖率**：确保代码质量
6. **边界测试**：测试异常情况
7. **使用工厂**：简化测试数据创建
