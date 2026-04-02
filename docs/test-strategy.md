# WeTogether 测试策略文档

## 1. 测试金字塔规划

```
        ┌─────────────┐
        │   E2E Tests │  10%
        │   (端到端)   │
        ├─────────────┤
        │ Integration │  30%
        │    Tests    │
        │  (集成测试)  │
        ├─────────────┤
        │    Unit     │  60%
        │    Tests    │
        │  (单元测试)  │
        └─────────────┘
```

### 测试覆盖率目标

| 测试类型 | 覆盖率目标 | 说明 |
|---------|-----------|------|
| 单元测试 | 80%+ | Service、Util 函数 |
| 集成测试 | 60%+ | Controller + Service |
| E2E 测试 | 核心流程 | 注册、登录、发帖、聊天 |

---

## 2. 单元测试策略

### 2.1 Service 层测试

#### AuthService 测试示例

```typescript
// src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { PointsService } from '../points/points.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../common/redis/redis.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let pointsService: jest.Mocked<PointsService>;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByMobile: jest.fn(),
            findByInviteCode: jest.fn(),
            create: jest.fn(),
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
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            setJson: jest.fn(),
            getJson: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    pointsService = module.get(PointsService);
    jwtService = module.get(JwtService);
    redisService = module.get(RedisService);
  });

  describe('sendSms', () => {
    it('应该成功发送验证码', async () => {
      const mobile = '13800138000';
      redisService.get.mockResolvedValue(null); // 无频率限制

      const result = await service.sendSms(mobile);

      expect(result).toEqual({ message: '验证码已发送' });
      expect(redisService.setJson).toHaveBeenCalledWith(
        `sms:code:${mobile}`,
    xpect.objectContaining({ code: expect.any(String) }),
        300
      );
      expect(redisService.set).toHaveBeenCalledWith(
        `sms:rate:${mobile}`,
        '1',
        60
      );
    });

    it('应该拒绝频繁发送', async () => {
      const mobile = '13800138000';
      redisService.get.mockResolvedValue('1'); // 存在频率限制

      await expect(service.sendSms(mobile)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'password123',
        code: '123456',
        nickname: 'testuser',
        gender: 1,
      };

      redisService.getJson.mockResolvedValue({
        code: '123456',
        createdAt: Date.now(),
      });
      userService.findByMobile.mockResolvedValue(null);
      userService.findByInviteCode.mockResolvedValue(null);
      userService.create.mockResolvedValue({
        id: 1,
        mobile: dto.mobile,
        nickname: dto.nickname,
      } as any);
      jwtService.sign.mockReturnValue('mock-token');

      const result = await service.register(dto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(userService.create).toHaveBeenCalled();
      expect(pointsService.addPoints).toHaveBeenCalledWith(
        1,
        2000,
        expect.any(Number),
        0,
        '注册赠送'
      );
    });

    it('应该拒绝已注册的手机号', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'password123',
        code: '123456',
        nickname: 'testuser',
        gender: 1,
      };

      redisService.getJson.mockResolvedValue({
        code: '123456',
        createdAt: Date.now(),
      });
      userService.findByMobile.mockResolvedValue({ id: 1 } as any);

      await expect(service.register(dto)).rejects.toThrow(
        '手机号已注册'
      );
    });

    it('应该拒绝错误的验证码', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'password123',
        code: '123456',
        nickname: 'testuser',
        gender: 1,
      };

      redisService.getJson.mockResolvedValue({
        code: '654321', // 错误的验证码
        createdAt: Date.now(),
      });

      await expect(service.register(dto)).rejects.toThrow(
        '验证码错误'
      );
    });
  });

  describe('login', () => {
    it('应该成功登录', async () => {
      const dto = { mobile: '13800138000', password: 'password123' };
      const user = {
        id: 1,
        mobile: dto.mobile,
        password: '$2a$10$hashedpassword',
        status: 0,
      };

      userService.findByMobile.mockResolvedValue(user as any);
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-token');

      const result = await service.login(dto);

      expect(result).toHaveProperty('token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('应该拒绝不存在的用户', async () => {
      const dto = { mobile: '13800138000', password: 'password123' };
      userService.findByMobile.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow('用户不存在');
    });

    it('应该拒绝错误的密码', async () => {
      const dto = { mobile: '13800138000', password: 'wrongpassword' };
      const user = {
        id: 1,
        mobile: dto.mobile,
        password: '$2a$10$hashedpassword',
        status: 0,
      };

      userService.findByMobile.mockResolvedValue(user as any);
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow('密码错误');
    });
  });
});
```

---

### 2.2 Controller 层测试

#### AuthController 测试示例

```typescript
// src/modules/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            sendSms: jest.fn(),
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthControlAuthController);
    service = module.get(AuthService);
  });

  describe('sendSms', () => {
    it('应该调用 AuthService.sendSms', async () => {
      const dto = { mobile: '13800138000' };
      service.sendSms.mockResolvedValue({ message: '验证码已发送' });

      const result = await controller.sendSms(dto);

      expect(service.sendSms).toHaveBeenCalledWith(dto.mobile);
      expect(result).toEqual({ message: '验证码已发送' });
    });
  });

  describe('register', () => {
    it('应该调用 AuthService.register', async () => {
      const dto = {
        mobile: '13800138000',
        password: 'password123',
        code: '123456',
        nickname: 'testuser',
        gender: 1,
      };
      const mockResult = { token: 'mock-token', user: {} };
      service.register.mockResolvedValue(mockResult);

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });
  });
});
```

---

### 2.3 Repository 层测试

```typescript
// src/modules/user/user.service.spec.ts
describe('UserService - Repository', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  describe('findByMobile', () => {
    it('应该返回用户', async () => {
      const user = { id: 1, mobile: '13800138000' };
      jest.spyOn(repository, 'findOne').mockResolvedValue(user as any);

      const result = await service.findByMobile('13800138000');

      expect(result).toEqual(user);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { mobile: '13800138000' },
      });
    });
  });
});
```

---

## 3. 集成测试策略

### 3.1 Controller + Service 集成测试

```typescript
// test/integration/auth.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/modules/user/entities/user.entity';
import { Repository } from 'typeorm';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get(getRepositoryToken(User));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 清理测试数据
    await userRepository.delete({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('应该成功注册新用户', async () => {
      // 1. 发送验证码
      await request(app.getHttpServer())
        .post('/api/v1/auth/sms/send')
        .send({ mobile: '13800138000' })
        .expect(201);

      // 2. 注册（使用固定验证码用于测试）
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          mobile: '13800138000',
          password: 'password123',
          code: '123456', // 测试环境固定验证码
          nickname: 'testuser',
          gender: 1,
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.mobile).toBe('13800138000');

      // 3. 验证数据库
      const user = await userRepository.findOne({
        where: { mobile: '13800138000' },
      });
      expect(user).toBeDefined();
      expect(user.points).toBe(2000); // 初始积分
    });

    it('应该拒绝重复注册', async () => {
      // 先注册一次
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          mobile: '13800138000',
          password: 'password123',
          code: '123456',
          nickname: 'testuser',
          gender: 1,
        });

      // 再次注册
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          mobile: '13800138000',
          password: 'password123',
          code: '123456',
          nickname: 'testuser2',
          gender: 1,
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // 创建测试用户
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          mobile: '13800138000',
          password: 'password123',
          code: '123456',
          nickname: 'testuser',
          gender: 1,
        });
    });

    it('应该成功登录', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: '13800138000',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.mobile).toBe('13800138000');
    });

    it('应该拒绝错误的密码', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          mobile: '13800138000',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });
});
```

---

## 4. E2E 测试策略

### 4.1 完整业务流程测试

```typescript
// test/e2e/user-journey.e2e-spec.ts
describe('用户完整旅程 (E2E)', () => {
  let app: INestApplication;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. 用户注册', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        mobile: '13900139000',
        password: 'password123',
        code: '123456',
        nickname: 'e2euser',
        gender: 1,
      })
      .expect(201);

    token = response.body.token;
    userId = response.body.user.id;
    expect(token).toBeDefined();
  });

  it('2. 获取用户信息', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/user/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.mobile).toBe('13900139000');
    expect(response.body.points).toBe(2000);
 t('3. 更新用户资料', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nickname: 'updated-nickname',
      })
      .expect(200);
  });

  it('4. 发布帖子', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/square/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: '这是我的第一条帖子',
        images: [],
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });

  it('5. 获取帖子列表', ac () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/square/posts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('6. 每日签到', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/points/sign')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(response.body.points).toBeGreaterThan(2000);
  });
});
```

---

## 5. WebSocket 测试策略

### 5.1 WebSocket 连接测试

```typescript
// test/websocket/chat.gateway.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WebSocketModule } from '../../src/modules/websocket/websocket.module';
import * as WebSocket from 'ws';

describe('ChatGateway (WebSocket)', () => {
  let app: INestApplication;
  let wsUrl: string;
  let token: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [WebSocketModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0); // 随机端口

    const address = app.getHttpServer().address();
    wsUrl = `ws://localhost:${address.port}/ws`;

    // 获取测试 token
    token = 'mock-jwt-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('应该成功建立 WebSocket 连接', (done) => {
    const ws = new WebSocket(`${wsUrl}?token=${token}`);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });

    ws.on('error', (error) => {
      done(error);
    });
  });

  it('应该拒绝无 token 的连接', (done) => {
    const ws = new WebSocket(wsUrl);

    ws.on('close', () => {
      done();
    });

    ws.on('open', () => {
      done(new Error('不应该连接成功'));
    });
  });

  it('应该接收连接成功消息', (done) => {
    const ws = new WebSocket(`${wsUrl}?token=${token}`);

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('connected');
      expect(message.data).toHaveProperty('userId');
      ws.close();
      done();
    });
  });

  it('应该响应 ping 消息', (done) => {
    const ws = new WebSocket(`${wsUrl}?token=${token}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'ping' }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'pong') {
        expect(message.data).toHaveProperty('timestamp');
        ws.close();
        done();
      }
    });
  });
});
```

---

## 6. Mock 策略

### 6.1 数据库 Mock

```typescript
// test/mocks/database.mock.ts
export const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

export const createMockRepository = () => ({
  ...mockRepository,
});
```

### 6.2 Redis Mock

```typescript
// test/mocks/redis.mock.ts
export const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  getJson: jest.fn(),
  setJson: jest.fn(),
};
```

### 6.3 MinIO Mock

```typescript
// test/mocks/minio.mock.ts
export const mockMinioService = {
  uploadFile: jest.fn().mockResolvedValue({
    filePath: 'test/file.jpg',
  }),
  generatePresignedUrl: jest.fn().mockResolvedValue(
    'http://localhost:9002/test/file.jpg?token=xxx'
  ),
  deleteFile: jest.fn().mockResolvedValue(true),
};
```

---

## 7. 测试数据准备

### 7.1 测试数据工厂

```typescript
// test/factories/user.factory.ts
import { User } from '../../src/modules/user/entities/user.entity';
import * as bcrypt from 'bcryptjs';

export class UserFactory {
  static async create(overrides?: Partial<User>): Promise<User> {
    const user = new User();
    user.id = overrides?.id || 1;
    user.mobile = overrides?.mobile || '13800138000';
    user.password = overrides?.password || await bcrypt.hash('password123', 10);
    user.nickname = overrides?.nickname || 'testuser';
    user.gender = overrides?.gender || 1;
    user.points = overrides?.points || 2000;
    user.inviteCode = overrides?.inviteCode || 'TESTCODE';
    user.status = overrides?.status || 0;
    return user;
  }

  static async createMany(count: number): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create({
        id: i + 1,
        mobile: `1380013800${i}`,
        nickname: `testuser${i}`,
      }));
    }
    return users;
  }
}
```

### 7.2 测试数据清理

```typescript
// test/helpers/database.helper.ts
import { getConnection } from 'typeorm';

export async function clearDatabase() {
  const connection = getConnection();
  const entities = connection.entityMetadatas;

  for (const entity of entities) {
    const repository = connection.getRepository(entity.name);
    await repository.query(`DELETE FROM ${entity.tableName}`);
  }
}
```

---

## 8. CI/CD 集成

### 8.1 Jest 配置

```javascript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### 8.2 测试脚本

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:integration": "jest --config ./test/jest-integration.json"
  }
}
```

---

## 9. 测试最佳实践

### 9.1 测试命名规范

```typescript
describe('AuthService', () => {
  describe('sendSms', () => {
    it('应该成功发送验证码', () => {});
    it('应该拒绝频繁发送', () => {});
    it('应该在发送失败时抛出异常', () => {});
  });
});
```

### 9.2 AAA 模式

```typescript
it('应该成功登录', async () => {
  // Arrange (准备)
  const dto = { mobile: '13800138000', password: 'password123' };
  userService.findByMobile.mockResolvedValue(mockUser);

  // Act (执行)
  const result = await service.login(dto);

  // Assert (断言)
  expect(result).toHaveProperty('token');
  expect(result.user.mobile).toBe(dto.mobile);
});
```

### 9.3 测试隔离

```typescript
beforeEach(() => {
  jest.clearAllMocks(); // 清理 mock
});

afterEach(async () => {
  await clearDatabase(); // 清理数据库
});
```

---

## 10. 测试覆盖率报告

### 10.1 生成报告

```bash
pnpm run test:cov
```

### 10.2 查看报告

```bash
open coverage/lcov-report/index.html
```

---

## 11. 总结

本测试策略文档涵盖了：
- 单元测试（Service、Controller、Repository）
- 集成测试（模块间交互）
- E2E 测试（完整业务流程）
- WebSocket 测试
- Mock 策略
- 测试数据管理
- CI/CD 集成

建议按照优先级逐步实施：
1. 先完成核心模块的单元测试（Auth、User）
2. 再完成集成测试
3. 最后完成 E2E 测试

目标是达到 80% 的测试覆盖率，确保代码质量和系统稳定性。
