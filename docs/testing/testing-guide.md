# Staging 环境测试指南

## 概览

本文档介绍如何在 Staging 环境中运行单元测试、集成测试和端到端测试。

## 测试类型

### 1. 单元测试 (Unit Tests)

**目的**: 测试单个函数、类或模块的功能

**特点**:
- 不依赖外部服务（数据库、Redis 等）
- 使用 Mock 对象模拟依赖
- 运行速度快
- 测试覆盖率高

**示例**: `test/unit/user.service.spec.ts`

### 2. 集成测试 (Integration Tests)

**目的**: 测试多个模块之间的交互

**特点**:
- 测试服务之间的集成
- 部分使用 Mock，部分使用真实依赖
- 运行速度中等

**示例**: `test/integration/auth.service.spec.ts`

### 3. 端到端测试 (E2E Tests)

**目的**: 测试完整的 API 请求流程

**特点**:
- 使用真实的数据库和 Redis
- 测试完整的 HTTP 请求/响应
- 运行速度较慢
- 最接近真实使用场景

**示例**: `test/e2e/auth.e2e-spec.ts`

---

## 测试结构

```
test/
├── unit/                      # 单元测试
│   └── user.service.spec.ts
├── integration/               # 集成测试
│   └── auth.service.spec.ts
├── e2e/                       # 端到端测试
│   ├── app.e2e-spec.ts
│   └── auth.e2e-spec.ts
├── .env.test                  # 测试环境配置
└── jest-e2e.json             # E2E 测试配置
```

---

## 快速开始

### 前置条件

1. **启动 Staging 环境**:
   ```bash
   ./deploy.sh staging start
   ```

2. **等待服务就绪**:
   ```bash
   # 等待 30 秒后运行健康检查
   ./deploy.sh staging health
   ```

3. **确保所有服务正常**:
   - ✅ MySQL 运行正常
   - ✅ Redis 运行正常
   - ✅ App 容器健康

---

## 运行测试

### 方式 1: 使用测试脚本（推荐）

```bash
# 运行所有测试
./test-staging.sh all

# 只运行单元测试
./test-staging.sh unit

# 只运行集成测试
./test-staging.sh integration

# 只运行端到端测试
./test-staging.sh e2e
```

**脚本功能**:
- ✅ 自动检查 Staging 环境状态
- ✅ 验证数据库和 Redis 连接
- ✅ 加载测试环境配置
- ✅ 运行指定类型的测试
- ✅ 显示测试结果

---

### 方式 2: 使用 npm 命令

```bash
# 运行所有测试
pnpm run test:staging:all

# 单元测试
pnpm run test:staging:unit

# 集成测试
pnpm run test:staging:integration

# 端到端测试
pnpm run test:staging:e2e
```

---

## 测试配置

### 测试环境配置 (test/.env.test)

```env
# 测试环境配置
NODE_ENV=test

# 数据库配置 (使用 staging 环境)
DB_HOST=127.0.0.1
DB_PORT=3308
DB_USERNAME=root
DB_PASSWORD=root123
DB_DATABASE=together_staging

# Redis 配置 (使用 staging 环境)
REDIS_HOST=127.0.0.1
REDIS_PORT=6384
REDIS_PASSWORD=

# JWT 配置
JWT_SECRET=test-secret-key
JWT_EXPIRES_IN=7d

# 应用配置
PORT=8125
```

---

## 测试示例

### 1. 单元测试示例

**文件**: `test/unit/user.service.spec.ts`

```typescript
describe('UserService (Unit)', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should return a user when found', async () => {
    mockRepository.findOne.mockResolvedValue(mockUser);
    const result = await service.findById(1);
    expect(result).toEqual(mockUser);
  });
});
```

**特点**:
- 使用 Mock Repository
- 不访问真实数据库
- 测试单个方法的逻辑

---

### 2. 集成测试示例

**文件**: `test/integration/auth.service.spec.ts`

```typescript
describe('AuthService (Integration)', () => {
  let service: AuthService;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
      vide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should return user data when credentials are valid', async () => {
    const result = await service.validateUser('13800000001', 'Test123456');
    expect(result).toBeDefined();
  });
});
```

**特点**:
- 测试多个服务的交互
- 部分使用 Mock
- 测试业务逻辑流程

---

### 3. 端到端测试示例

**文件**: `test/e2e/auth.e2e-spec.ts`

```typescript
describe('Auth API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.creatle({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should register a new user successfully', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('mobile', testUser.mobile);
      });
  });
});
```

**特点**:
- 测试完整的 HTTP 请求
- 使用真实的数据库和 Redis
- 测试 API 端点的完整流程

---

## 测试覆盖率

### 生成覆盖率报告

```bash
# 运行测试并生成覆盖率报告m run test:cov

# 查看覆盖率报告
open coverage/lcov-report/index.html
```

### 覆盖率目标

| 类型 | 目标 |
|------|------|
| 语句覆盖率 | > 80% |
| 分支覆盖率 | > 75% |
| 函数覆盖率 | > 80% |
| 行覆盖率 | > 80% |

---

## 常见问题

### 1. 测试失败：数据库连接错误

**错误**: `Access denied for user 'root'@'127.0.0.1'`

**解决**:
```bash
# 检查 staging 环境是否运行
./deploy.sh staging health

# 检查数据库连接
docker exec together-mysql-staging mysqladmin ping -h localhost -u root -proot123
```

### 2. 测试失败：端口被占用

**错误**: `Port 8125 is already in use`

**解决**:
```bash
# 检查端口占用
lsof -i :8125

# 停止占用端口的进程
kill -9 <PID>
` 3. 测试数据污染

**问题**: 测试之间相互影响

**解决**:
```typescript
// 在每个测试后清理数据
afterEach(async () => {
  await dataSource.query('DELETE FROM users WHERE mobile LIKE "139%"');
});
```

---

## 最佳实践

### 1. 测试隔离

- ✅ 每个测试应该独立运行
- ✅ 不依赖其他测试的执行顺序
- ✅ 使用 `beforeEach` 和 `afterEach` 清理状态

### 2. 测试数据

- ✅ 使用唯一的测试数据（如手机号以 139 开头）
- ✅ 测试后清理测试数据
- ✅ 不要使用生产数据

### 3. 测试命名

- ✅ 使用描述性的测试名称
- ✅ 遵循 "should ... when ..." 模式
- ✅ 清晰表达测试意图

**示例**:
```typescript
it('should return 401 when password is incorrect', () => {
  // ...
});

it('should create user successfully when all data is vad', () => {
  // ...
});
```

### 4. 断言

- ✅ 每个测试只测试一个功能点
- ✅ 使用明确的断言
- ✅ 避免过多的断言

---

## CI/CD 集成

### Jenkins Pipeline 集成

```groovy
stage('测试') {
    steps {
        script {
            // 运行单元测试
            sh 'pnpm run test:staging:unit'
            
            // 运行集成测试
            sh 'pnpm run test:staging:integration'
            
            // 运行 E2E 测试
            sh 'pnpm run test:staging:e2e'
            
            // 生成覆盖率报告
            sh 'pnpm run test:cov'
        }
    }
}
```

---

## 测试命令总览

```bash
# 测试脚本
./test-staging.sh all          # 运行所有测试
./test-staging.sh unit         # 单元测试
./test-staging.sh integration  # 集成测试
./test-staging.sh e2e          # 端到端测试

# npm 命令
pnpm run test                  # 运行所有测试
pnpm run test:unit             # 单元测试
pnpm run test:integration      # 集成测试
pnpm run test:e2e              # 端到端测试
pnpm run test:watch            # 监听模式
pnpm run test:cov              # 生成覆盖率报告

# Staging 环境测试
pnpm run test:staging:all      # 所有测试
pnpm run test:staging:unit     # 单元测试
pnpm run test:staging:integration  # 集成测试
pnpm run test:staging:e2e      # 端到端测试
```

---

## 相关文档

- [部署指南](./README.md)
- [健康检查](./READM证部署)
- [Docker Compose 部署](./docker-compose-deployment.md)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
