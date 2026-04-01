# WeTogether 测试方案总览

## 文档目的

本文档为 WeTogether 相亲平台后端项目提供完整的测试技术方案，包括单元测试、端到端测试（E2E）和自动化测试的设计与实施指南。

## 项目测试现状

### 当前状态
- **测试文件数量**: 0 个
- **测试覆盖率**: 0%
- **测试框架**: Jest 29.7.0（已配置但未使用）
- **E2E 测试**: 未实施
- **CI/CD 集成**: 未包含测试步骤

### 测试目标

1. **单元测试覆盖率**: 达到 80% 以上
2. **E2E 测试覆盖**: 覆盖所有核心业务流程
3. **自动化测试**: 集成到 CI/CD Pipeline
4. **测试文档**: 完善的测试用例文档
5. **测试数据**: 可复用的测试数据工厂

## 测试范围

### 1. 单元测试范围

#### 服务层（Service）- 15 个
- AuthService - 认证逻辑
- UserService - 用户管理
- ProfileService - 用户资料
- SquareService - 广场功能
- FriendService - 好友关系
- ChatService - 聊天消息
- PointsService - 积分系统
- CertificationService - 认证审核
- AdminService - 管理后台
- FileService - 文件管理
- PointsConfigService - 积分配置
- CertificationTypeService - 认证类型
- SystemConfigService - 系统配置
- RedisService - Redis 缓存
- MinioService - 对象存储

#### 控制器层（Controller）- 14 个
- 所有 API 端点的请求处理逻辑
- 参数验证
- 权限控制
- 异常处理

#### 工具类和辅助函数
- 装饰器（Decorators）
- 守卫（Guards）
- 拦截器（Interceptors）
- 过滤器（Filters）

### 2. E2E 测试范围

#### 核心业务流程
1. **用户注册登录流程**
   - 发送验证码 → 注册 → 登录 → Token 验证

2. **社交广场流程**
   - 发布帖子 → 评论 → 点赞 → 举报

3. **好友系统流程**
   - 关注用户 → 解锁私聊 → 发送消息 → 查看聊天记录

4. **积分系统流程**
   - 签到获取积分 → 消费积分 → 查看流水

5. **认证审核流程**
   - 提交认证 → 管理员审核 → 查看结果

6. **管理后台流程**
   - 管理员登录 → 用户管理 → 内容审核 → 举报处理

### 3. 自动化测试范围

#### API 自动化测试
- 所有 REST API 端点
- WebSocket 连接和消息推送
- 文件上传下载

#### 性能测试
- 并发用户测试
- 接口响应时间
- 数据库查询性能

#### 安全测试
- SQL 注入防护
- XSS 攻击防护
- JWT Token 安全性
- 权限控制验证

## 测试技术栈

### 核心框架
```
Jest 29.7.0              - 单元测试框架
Supertest 6.3.3          - HTTP 断言库（E2E）
@nestjs/testing 10.3.0   - NestJS 测试工具
ts-jest 29.1.1           - TypeScript 支持
```

### 辅助工具
```
faker-js/faker           - 测试数据生成
factory-girl             - 数据工厂模式
nock                     - HTTP Mock
jest-mock-extended       - Mock 增强
```

### 数据库测试
```
sqlite3                  - 内存数据库（单元测试）
testcontainers           - Docker 容器测试（E2E）
```

## 测试策略

### 测试金字塔

```
        /\
       /  \  E2E Tests (10%)
      /____\
     /      \
    / Integr \  Integration Tests (20%)
   /__________\
  /            \
 /  Unit Tests  \  Unit Tests (70%)
/________________\
```

### 测试原则

1. **快速反馈**: 单元测试应在秒级完成
2. **独立性**: 测试之间互不依赖
3. **可重复**: 测试结果稳定可靠
4. **可维护**: 测试代码清晰易懂
5. **真实性**: E2E 测试使用真实环境

## 测试环境

### 单元测试环境
- 内存数据库（SQLite）
- Mock 外部依赖（Redis、MinIO）
- 隔离的测试上下文

### E2E 测试环境
- Docker Compose 启动完整服务栈
- MySQL 测试数据库
- Redis 测试实例
- 独立的测试数据

### CI/CD 测试环境
- Jenkins Pipeline 集成
- 自动化测试执行
- 测试报告生成
- 覆盖率检查

## 测试指标

### 覆盖率目标
- **语句覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 75%
- **函数覆盖率**: ≥ 85%
- **行覆盖率**: ≥ 80%

### 质量指标
- **测试通过率**: 100%
- **测试执行时间**: 单元测试 < 30s，E2E < 5min
- **测试稳定性**: 无 flaky tests
- **代码质量**: 无严重 bug

## 实施计划

### 第一阶段：基础设施搭建（1-2 天）
1. 配置测试环境
2. 安装测试依赖
3. 创建测试工具类
4. 搭建数据工厂

### 第二阶段：单元测试（5-7 天）
1. Service 层测试
2. Controller 层测试
3. 工具类测试
4. 覆盖率优化

### 第三阶段：E2E 测试（3-5 天）
1. 核心流程测试
2. API 集成测试
3. WebSocket 测试
4. 异常场景测试

### 第四阶段：自动化集成（2-3 天）
1. CI/CD 集成
2. 测试报告配置
3. 性能测试
4. 安全测试

### 第五阶段：文档和优化（1-2 天）
1. 测试文档编写
2. 测试用例整理
3. 性能优化
4. 团队培训

## 文档结构

```
docs/unit-tech/
├── 01-overview.md                    # 总览（本文档）
├── 02-unit-test-guide.md            # 单元测试指南
├── 03-e2e-test-guide.md             # E2E 测试指南
├── 04-test-infrastructure.md        # 测试基础设施
├── 05-test-data-factory.md          # 测试数据工厂
├── 06-ci-cd-integration.md          # CI/CD 集成
├── 07-test-best-practices.md       # 测试最佳实践
└── 08-test-cases.md                 # 测试用例清单
```

## 预期成果

### 交付物
1. 完整的单元测试套件（80%+ 覆盖率）
2. 核心业务流程 E2E 测试
3. CI/CD 自动化测试集成
4. 测试文档和最佳实践指南
5. 可复用的测试工具和数据工厂

### 质量提升
1. 减少 bug 数量 50%+
2. 提高代码质量和可维护性
3. 加快新功能开发速度
4. 增强团队信心
5. 降低重构风险

## 后续优化方向

1. 引入 Mutation Testing（变异测试）
2. 实施 Visual Regression Testing（视觉回归测试）
3. 添加 Contract Testing（契约测试）
4. 集成 Chaos Engineering（混沌工程）
5. 建立测试度量仪表板

---

**文档版本**: v1.0  
**创建日期**: 2026-04-01  
**维护者**: 开发团队
