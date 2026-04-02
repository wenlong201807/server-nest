# 测试用例文档总览

## 📋 目录

- [测试指南](./testing-guide.md) - 完整的测试指南和最佳实践
- [单元测试用例](./unit-tests.md) - 所有单元测试用例说明
- [集成测试用例](./integration-tests.md) - 所有集成测试用例说明
- [E2E 测试用例](./e2e-tests.md) - 所有端到端测试用例说明

---

## 🎯 测试覆盖模块

### 核心模块

| 模块                     | 单元测试 | 集成测试 | E2E 测试 | 状态 |
| ------------------------ | -------- | -------- | -------- | ---- |
| **Auth** (认证)          | ✅       | ✅       | ✅       | 完成 |
| **User** (用户)          | ✅       | -        | -        | 完成 |
| **Certification** (认证) | ✅       | ✅       | ✅       | 完成 |
| **Friend** (好友)        | ✅       | ✅       | ✅       | 完成 |
| **Square** (广场)        | ✅       | ✅       | ✅       | 完成 |
| **Chat** (聊天)          | ✅       | ✅       | ✅       | 完成 |
| **Points** (积分)        | ✅       | ✅       | ✅       | 完成 |

---

## 🚀 快速开始

### 1. 启动测试环境

```bash
# 启动 Staging 环境
./deploy.sh staging start

# 检查健康状态
./deploy.sh staging health
```

### 2. 运行测试

```bash
# 运行所有测试
./test-staging.sh all

# 运行特定类型测试
./test-staging.sh unit          # 单元测试
./test-staging.sh integration   # 集成测试
./test-staging.sh e2e           # E2E 测试
```

### 3. 查看测试报告

```bash
# 生成覆盖率报告
pnpm run test:cov

# 查看报告
open coverage/lcov-report/index.html
```

---

## 📊 测试统计

### 测试文件数量

- **单元测试**: 7 个文件
- **集成测试**: 6 个文件
- **E2E 测试**: 6 个文件
- **总计**: 19 个测试文件

### 测试覆盖率目标

| 指标       | 目标  | 当前 |
| ---------- | ----- | ---- |
| 语句覆盖率 | > 80% | -    |
| 分支覆盖率 | > 75% | -    |
| 函数覆盖率 | > 80% | -    |
| 行覆盖率   | > 80% | -    |

---

## 📁 测试文件结构

```
test/
├── unit/                           # 单元测试
│   ├── user.service.spec.ts
│   ├── certification.service.spec.ts
│   ├── friend.service.spec.ts
│   ├── square.service.spec.ts
│   ├── chat.service.spec.ts
│   └── points.service.spec.ts
│
├── integration/                    # 集成测试
│   ├── auth.service.spec.ts
│   ├── certification.service.spec.ts
│   ├── friend.service.spec.ts
│   ├── square.service.spec.ts
│   ├── chat.service.spec.ts
│   └── points.service.spec.ts
│
├── e2e/                           # E2E 测试
│   ├── app.e2e-spec.ts
│   ├── auth.e2e-spec.ts
│   ├── certification.e2e-spec.ts
│   ├── friend.e2e-spec.ts
│   ├── square.e2e-spec.ts
│   ├── chat.e2e-spec.ts
│   └── points.e2e-spec.ts
│
├── .env.test                      # 测试环境配置
└── jest-e2e.json                  # E2E 测试配置
```

---

## 🔧 测试命令

### 测试脚本

```bash
./test-staging.sh all          # 运行所有测试
./test-staging.sh unit         # 单元测试
./test-staging.sh integration  # 集成测试
./test-staging.sh e2e          # E2E 测试
```

### npm 命令

```bash
# 基础测试命令
pnpm run test                  # 运行所有测试
pnpm run test:unit             # 单元测试
pnpm run test:integration      # 集成测试
pnpm run test:e2e              # E2E 测试
pnpm run test:watch            # 监听模式
pnpm run test:cov              # 生成覆盖率报告

# Staging 环境测试
pnpm run test:staging:all      # 所有测试
pnpm run test:staging:unit     # 单元测试
pnpm run test:staging:integration  # 集成测试
pnpm run test:staging:e2e      # E2E 测试
```

---

## 📖 测试文档

### 1. [测试指南](./testing-guide.md)

完整的测试指南，包括：

- 测试类型说明
- 测试环境配置
- 运行测试方法
- 测试最佳实践
- 常见问题解决

### 2. [单元测试用例](./unit-tests.md)

所有单元测试的详细说明：

- UserService 测试用例
- CertificationService 测试用例
- FriendService 测试用例
- SquareService 测试用例
- ChatService 测试用例
- PointsService 测试用例

### 3. [集成测试用例](./integration-tests.md)

所有集成测试的详细说明：

- AuthService 集成测ertification 模块集成测试
- Friend 模块集成测试
- Square 模块集成测试
- Chat 模块集成测试
- Points 模块集成测试

### 4. [E2E 测试用例](./e2e-tests.md)

所有端到端测试的详细说明：

- Auth API 测试
- Certification API 测试
- Friend API 测试
- Square API 测试
- Chat API 测试
- Points API 测试

---

## 🎯 测试覆盖的功能

### Auth (认证) 模块

- ✅ 用户注册
- ✅ 用户登录
- ✅ JWT 令牌生成
- ✅ 密码验证
- ✅ 参数验证

### User (用户) 模块

- ✅ 查找用户
- ✅ 更新用户信息
- ✅ 更新积分
- ✅ 软删除用户

### Certification (认证) 模块

- ✅ 提交认证（6种类型）
- ✅ 获取认证列表
- ✅ 管理员审核
- ✅ 状态过滤

### Friend (好友) 模块

- ✅ 关注/取消关注
- ✅ 解锁聊天
- ✅ 获取好友列表
- ✅ 拉黑/取消拉黑
- ✅ 删除好友

### Square (广场) 模块

- ✅ 创建/删除帖子
- ✅ 获取帖子列表取消点赞
- ✅ 评论/回复
- ✅ 举报帖子

### Chat (聊天) 模块

- ✅ 发送消息
- ✅ 获取聊天历史
- ✅ 获取会话列表
- ✅ 标记已读

### Points (积分) 模块

- ✅ 获取积分余额
- ✅ 签到
- ✅ 获取积分历史
- ✅ 积分交易

---

## 🔍 测试最佳实践

### 1. 测试隔离

- 每个测试独立运行
- 不依赖其他测试的执行顺序
- 使用 `beforeEach` 和 `afterEach` 清理状态

### 2. 测试数据

- 使用唯一的测试数据
- 测试后清理测试数据
- 不使用生产数据

### 3. 测试命名

- 使用描述性的测试名称
- 遵循 "should ... when ..." 模式
- 清晰表达测试意图

### 4. Mock 使用

- 单元测试：Mock 所有外部依赖
- 集成测试：部分 Mock
- E2E 测试：使用真实依赖

---

## 📝 贡献指南

### 添加新测试

1. **确定测试类型**：单元测试、集成测试或 E2E 测试
2. **创建测试文件**：在对应目录下创建 `.spec.ts文件
3. **编写测试用例**：遵循现有测试模式
4. **运行测试验证**：确保测试通过
5. **更新文档**：在对应的测试用例文档中添加说明

### 测试代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 Jest 测试框架
- 遵循 AAA 模式（Arrange, Act, Assert）

---

## 🐛 问题反馈

如果在测试过程中遇到问题：

1. 查看 [测试指南](./testing-guide.md) 的常见问题部分
2. 检查测试环境是否正常运行
3. 查看测试日志获取详细错误信息
4. 联系开发团队

---

## 📚 相关文档

- [部署指南](../deployment/README.md)
- [健康检查](../deployment/README.md#验证部署)
- [Docker Compose 部署](../deployment/docker-compose-deployment.md)
- [API 文档](http://localhost:8125/api/docs)

---

**文档版本**: v1.0
**最后更新**: 2026-04-02
**维护者**: 开发团队
