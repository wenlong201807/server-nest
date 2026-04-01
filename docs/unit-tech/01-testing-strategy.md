# WeTogether 测试策略方案

## 1. 测试目标

为 WeTogether 相亲平台后端建立完整的测试体系，确保：
- 代码质量和可维护性
- 业务逻辑正确性
- API 接口稳定性
- 系统集成可靠性
- 回归测试自动化

## 2. 测试金字塔

```
        /\
       /  \      E2E Tests (10%)
      /----\     - 关键业务流程
     /      \    - 用户场景测试
    /--------\   
   / Integration\ (30%)
  /    Tests    \ - API 接口测试
 /--------------\ - 数据库集成
/   Unit Tests   \ (60%)
/________________\ - Service 层
                   - Utils/Helpers
```

## 3. 测试分层策略

### 3.1 单元测试 (Unit Tests)
**目标覆盖率**: 80%+

**测试范围**:
- Service 层业务逻辑
- Utils/Helpers 工具函数
- Guards/Interceptors/Filters
- DTO 验证逻辑

**技术栈**:
- Jest (测试框架)
- @nestjs/testing (NestJS 测试工具)
- Mock 数据库和外部依赖

### 3.2 集成测试 (Integration Tests)
**目标覆盖率**: 70%+

**测试范围**:
- Controller + Service 集成
- 数据库操作 (TypeORM)
- Redis 缓存操作
- 文件上传集成

**技术栈**:
- Jest
- 测试数据库 (Docker MySQL)
- 测试 Redis (Docker Redis)

### 3.3 端到端测试 (E2E Tests)
**目标覆盖率**: 关键业务流程 100%

**测试范围**:
- 完整用户注册登录流程
- 发帖-评论-点赞流程
- 好友关系-解锁私聊流程
- 积分系统流程
- 管理后台审核流程

**技术栈**:
- Jest + Supertest
- 独立测试环境
- 测试数据自动清理

## 4. 测试环境配置

### 4.1 测试数据库
```yaml
MySQL Test:
  Host: localhost
  Port: 3310
  Database: wetogether_test
  User: test_user
  Password: test_pass

Redis Test:
  Host: localhost
  Port: 6385
  DB: 15
```

### 4.2 环境变量
创建 `.env.test` 文件:
```env
NODE_ENV=test
DB_HOST=localhost
DB_PORT=3310
DB_USERNAME=test_user
DB_PASSWORD=test_pass
DB_DATABASE=wetogether_test
REDIS_HOST=localhost
REDIS_PORT=6385
JWT_SECRET=test_secret_key
```

## 5. 测试数据管理

### 5.1 Fixtures (测试夹具)
创建可复用的测试数据:
- 用户数据 (users.fixture.ts)
- 帖子数据 (posts.fixture.ts)
- 好友关系 (friendships.fixture.ts)

### 5.2 数据清理策略
- 每个测试套件前: 清空相关表
- 每个测试后: 回滚事务或清理数据
- 使用 beforeEach/afterEach 钩子

## 6. Mock 策略

### 6.1 需要 Mock 的服务
- 短信服务 (SMS)
- 文件存储 (MinIO/RustFS)
- 外部 API 调用
- 时间相关函数

### 6.2 不 Mock 的部分
- 数据库操作 (使用测试数据库)
- Redis 操作 (使用测试 Redis)
- 核心业务逻辑

## 7. 测试命名规范

### 7.1 文件命名
```
单元测试: *.service.spec.ts
集成测试: *.controller.spec.ts
E2E 测试: *.e2e-spec.ts
```

### 7.2 测试用例命名
```typescript
describe('UserService', () => {
  describe('findById', () => {
    it('should return user when id exists', async () => {});
    it('should throw NotFoundException when id not exists', async () => {});
  });
});
```

## 8. CI/CD 集成

### 8.1 测试流程
```yaml
Pipeline:
  1. 代码检查 (ESLint)
  2. 单元测试 (npm run test)
  3. 集成测试 (npm run test:integration)
  4. E2E 测试 (npm run test:e2e)
  5. 覆盖率报告 (npm run test:cov)
  6. 构建部署
```

### 8.2 测试门禁
- 单元测试覆盖率 >= 80%
- 集成测试覆盖率 >= 70%
- 所有 E2E 测试通过
- 无 ESLint 错误

## 9. 测试优先级

### P0 (必须测试)
- 认证授权 (Auth)
- 用户注册登录
- 积分系统
- 支付相关

### P1 (重要测试)
- 好友系统
- 聊天功能
- 广场帖子
- 管理后台

### P2 (一般测试)
- 文件上传
- 系统配置
- 统计报表

## 10. 测试工具链

```json
{
  "jest": "^29.7.0",
  "ts-jest": "^29.1.1",
  "@nestjs/testing": "^10.3.0",
  "supertest": "^6.3.3",
  "@types/supertest": "^6.0.2",
  "faker": "^5.5.3",
  "@faker-js/faker": "^8.4.0"
}
```

## 11. 测试报告

### 11.1 覆盖率报告
- HTML 报告: `coverage/index.html`
- JSON 报告: `coverage/coverage-final.json`
- 控制台输出

### 11.2 测试结果
- JUnit XML 格式 (CI/CD 集成)
- 失败截图 (E2E)
- 性能指标

## 12. 最佳实践

### 12.1 测试原则
- AAA 模式: Arrange, Act, Assert
- 单一职责: 每个测试只验证一个行为
- 独立性: 测试之间不相互依赖
- 可重复: 测试结果稳定可靠

### 12.2 避免的反模式
- 测试实现细节而非行为
- 过度 Mock 导致测试无意义
- 测试之间共享状态
- 忽略边界条件和异常情况

## 13. 实施计划

### Phase 1: 基础设施 (Week 1)
- 配置测试环境
- 搭建测试数据库
- 创建测试工具和 Fixtures

### Phase 2: 单元测试 (Week 2-3)
- Auth Service
- User Service
- Points Service
- Friend Service

### Phase 3: 集成测试 (Week 4)
- API 接口测试
- 数据库集成测试

### Phase 4: E2E 测试 (Week 5)
- 关键业务流程
- 用户场景测试

### Phase 5: CI/CD 集成 (Week 6)
- Jenkins Pipeline
- 自动化测试报告

## 14. 成功指标

- 单元测试覆盖率 >= 80%
- 集成测试覆盖率 >= 70%
- E2E 测试通过率 100%
- 测试执行时间 < 5 分钟
- 零测试 Flaky (不稳定测试)
