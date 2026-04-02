# 集成测试用例文档

## 概览

集成测试用于测试多个模块之间的协作，部分使用 Mock 对象，部分使用真实依赖，验证模块间的交互是否正确。

---

## 1. AuthService 集成测试

**文件**: `test/integration/auth.service.spec.ts`

### 测试用例

#### 1.1 validateUser

**测试场景**: 验证用户凭证

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 正确的凭证 | mobile: '13800000001', password: 'Test123456' | 返回用户数据（不含密码） | ✅ |
| 用户不存在 | mobile: '19999999999', password: 'Test123456' | 返回 null | ✅ |
| 密码错误 | mobile: '13800000001', password: 'WrongPassword' | 返回 null | ✅ |

**代码示例**:
```typescript
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
```

#### 1.2 login

**测试场景**: 用户登录

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 登录成功 | user: mockUser | 返回 access_token 和用户信息 | ✅ |

**特点**:
- 使用真实的 JWT 签名
- 验证 token 包含正确的 payload

#### 1.3 register

**测试场景**: 用户注册

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 注册新用户 | 完整注册信息 | 创建用户成功 | ✅ |
| 手机号已存在 | mobile: '13800000001' | 抛出错误 | ✅ |
| 邀请码已存在 | inviteCode: 'TEST001' | 抛出错误 | ✅ |

---

## 2. CertificationService 集成测试

**文件**: `test/integration/certification.service.spec.ts`

### 测试用例

#### 2.1 认证审核工作流

**测试场景**: 完整的认证审核流程

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 创建并通过认证 | type: ID_CARD | 状态从 PENDING 变为 APPROVED | ✅ |
| 创建并拒绝认证 | type: EDUCATION | 状态从 PENDING 变为 REJECTED | ✅ |

**代码示例**:
```typescript
it('shte full certification approval workflow', async () => {
  // Step 1: Create certification
  const certification = await service.create(userId, dto);
  expect(certification.status).toBe(CertificationStatus.PENDING);

  // Step 2: Approve certification
  await service.approve(certification.id, reviewerId);
  expect(savedCert.status).toBe(CertificationStatus.APPROVED);
  expect(savedCert.reviewedBy).toBe(reviewerId);
});
```

#### 2.2 多认证管理

**测试场景**: 管理同一用户的多个认证

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取所有认证 | userId: 1 | 返回所有认证列表 | ✅ |
| 按状态过滤 | userId: 1, status: APPROVED | 返回已通过的认证 | ✅ |

#### 2.3 所有认证类型

**测试场景**: 支持所有认证类型

| 认证类型 | 状态 |
|---------|------|
| HOUSE (房产认证) | ✅ |
| EDUCATION (学历认证) | ✅ |
| ID_CARD (身份证认证) | ✅ |
| BUSINESS (营业执照认证) | ✅ |
| DRIVER (驾驶证认证) | ✅ |
| UTILITY (水电费单认证) | ✅ |

---

## 3. FriendService 集成测试

**文件**: `test/integration/friend.service.spec.ts`

### 测试用例

#### 3.1 关注到好友工作流

**测试场景**: 从关注到成为好友的完整流程

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|---------|------|
| 1 | 关注用户 | 状态为 FOLLOWING | ✅ |
| 2 | 发送 8 条消息 | chatCount 增加到 8 | ✅ |
| 3 | 解锁聊天 | 状态变为 FRIEND，扣除 50 积分 | ✅ |

**代码示例**:
```typescript
it('should complete full follow to friend workflow', async () => {
  // Step 1: Follow user
  const followResult = await service.follow(1, 2);
  expect(followResult.status).toBe(FriendStatus.FOLLOWING);

  // Step 2: Simulate chat messages
  for (let i = 0; i < 8; i++) {
    await service.updateChatCount(1, 2);
  }

  // Step 3: Unlock chat
  const unlockResult = await service.unlockChat(1, 2);
  expect(unlockResult.unlocked).toBe(true);
  expect(unlockResult.pointsConsumed).toBe(50);
});
```

#### 3.2 拉黑和解除拉黑工作流

**测试场景**: 拉黑用户并验证交互限制

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 拉黑用户 | userId: 1, blockedId: 2 | 创建拉黑记录 | ✅ |
| 检查拉黑状态 | userId: 1, blockedId: 2 | 返回 true | ✅ |
| 获取拉黑列表 | userId: 1 | 返回拉黑用户列表 | ✅ |

#### 3.3 好友状态检查

**测试场景**: 不同阶段的好友状态

| 阶段 | isFollowing | isFriend | canChat | 状态 |
|------|------------|----------|---------|------|
| 未关注 | false | false | false | ✅ |
| 关注但消息不足 | true | false | false | ✅ |
| 关注且消息足够 | true | false | true | ✅ |
| 已成为好友 | true | true | true | ✅ |

#### 3.4 边界情况

**测试场景**: 异常情况处理

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 删除不存在的好友 | friendId: 999 | 抛出 NotFoundException | ✅ |
| 关注自己 | userId: 1, friendId: 1 | 抛出 BadRequestException | ✅ |
| 重复关注 | 已关注的用户 | 抛出 BadRequestException | ✅ |
| 积分不足解锁 | points: 30 | 抛出 BadRequestException | ✅ |

---

## 4. SquareService 集成测试

**文件**: `test/integration/square.service.spec.ts`

### 测试用例

#### 4.1 创建和获取帖子

**测试场景**: 发布帖子并检索

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 创建文本帖子 | content: '测试帖子' | 创建成功，获得 5 积分 | ✅ |
| 创建图片帖子 | content + images | 创建成功，包含图片 | ✅ |
| 按最新排序 | sort: 'latest' | 按时间倒序返回 | ✅ |
| 按热门排序 | sort: 'hot' | 按点赞数排序 | ✅ |

**特点**:
- 使用 SQLite 内存数据库
- 真实的数据库操作
- 验证积分奖励机制

#### 4.2 获取单个帖子

**测试场景**: 根据 ID 获取帖子详情

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取存在的帖子 | postId: 1 | 返回帖子详情 | ✅ |
| 获取不存在的帖子 | postId: 999 | 抛出 NotFoundException | ✅ |

#### 4.3 删除帖子

**测试场景**: 软删除帖子

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 删除自己的帖子 | userId: 1, postId: 1 | 状态变为 DELETED | ✅ |
| 删除不存在的帖子 | postId: 999 | 抛出 NotFoundException | ✅ |
| 删除他人帖子 | userId: 2, postId: 1 | 抛出 NotFoundException | ✅ |

#### 4.4 评论功能

**测试场景**: 创建评论和回复

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 创建顶级评论 | postId: 1, content: '评论' | 创建成功，获得 2 积分 | ✅ |
| 创建回复 | postId: 1, replyToId: 1 | 创建回复成功 | ✅ |
| 更新评论数 | 创建 2 条评论 | 帖子 commentCount 为 2 | ✅ |
| 获取回复列表 | commentId: 1 | 返回该评论的所有回复 | ✅ |

#### 4.5 点赞功能

**测试场景**: 点赞和取消点赞

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 点赞帖子 | userId: 2, postId: 1 | 点赞数+1，获得 1 积分 | ✅ |
| 取消点赞 | userId: 2, postId: 1 | 点赞数-1 | ✅ |
| 多用户点赞 | 用户 2 和 3 点赞 | 点赞数为 2 | ✅ |

#### 4.6 举报功能

**测试场景**: 举报帖子

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 举报帖子 | postId: 1, reason: PORNOGRAPHY | 创建举报记录 | ✅ |
| 多次举报 | 不同用户举报同一帖子 | 创建多条举报记录 | ✅ |

#### 4.7 分页功能

**测试场景**: 分页查询

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 帖子分页 | 25 条帖子，每页 20 条 | 第 1 页 20 条，第 2 页 5 条 | ✅ |
| 评论分页 | 25 条评论，每页 20 条 | 第 1 页 20 条，第 2 页 5 条 | ✅ |

---

## 5. ChatService 集成测试

**文件**: `test/integration/chat.service.spec.ts`

### 测试用例

#### 5.1 发送消息工作流

**测试场景**: 完整的消息发送流程

| 步骤 | 操作 | 验证点 | 状态 |
|------|------|--------|------|
| 1 | 检查好友关系 | isFriend 被调用 | ✅ |
| 2 | 检查拉黑状态 | isBlocked 被调用 | ✅ |
| 3 | 保存消息 | 消息保存到数据库 | ✅ |
| 4 | 更新聊天次数 | 双方 chatCount 更新 | ✅ |
| 5 | 发送 WebSocket | 双方收到消息推送 | ✅ |

**代码示例**:
```typescript
it('should complete full message sending workflow', async () => {
  mockFriendService.isFriend.mockResolvedValue(true);
  mockFriendService.isBlocked.mockResolvedValue(false);

  const result = await service.sendMessage(1, sendMessageDto);

  expect(mockFriendService.isFriend).toHaveBeenCalledWith(1, 2);
  expect(mockFriendService.isBlocked).toHaveBeenCalledWith(1, 2);
  expect(mockMessageRepository.save).toHaveBeenCalled();
  expect(mockFriendService.updateChatCount).toHaveBeenCalledTimes(2);
  expect(mockWsGateway.sendMessage).toHaveBeenCalledTimes(2);
});
```

#### 5.2 消息类型

**测试场景**: 支持不同消息类型

| 消息类型 | 状态 |
|---------|------|
| TEXT (文本消息) | ✅ |
| IMAGE (图片消息) | ✅ |

#### 5.3 发送限制

**测试场景**: 消息发送限制

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 非好友发送 | isFriend: false | 抛出 '请先解锁私聊' | ✅ |
| 被拉黑发送 | isBlocked: true | 抛出 '对方已拉黑你' | ✅ |

#### 5.4 聊天历史

**测试场景**: 获取聊天记录

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取历史消息 | userId: 1, friendId: 2 | 返回消息列表，标记 isSelf | ✅ |
| 分页查询 | page: 1, pageSize: 50 | 返回第 1 页数据 | ✅ |
| 游标分页 | beforeId: 100 | 返回 ID < 100 的消息 | ✅ |

#### 5.5 会话列表

**测试场景**: 获取会话列表

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 单个会话 | userId: 1 | 返回会话信息和未读数 | ✅ |
| 多个会话 | userId: 1 | 返回所有会话列表 | ✅ |

#### 5.6 标记已读

**测试场景**: 标记消息已读

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 标记已读 | userId: 1, friendId: 2 | 所有未读消息变为已读 | ✅ |
| 无未读消息 | userId: 1, friendId: 2 | 正常处理，affected: 0 | ✅ |

#### 5.7 完整聊天流程

**测试场景**: 发送、检索、标记已读的完整流程

| 步骤 | 操作 | 预期结果 | 状态 |
|------|------|---------|------|
| 1 | 发送消息 | 消息创建成功 | ✅ |
| 2 | 获取历史 | 返回包含新消息的列表 | ✅ |
| 3 | 标记已读 | 消息状态更新 | ✅ |

---

## 6. PointsService 集成测试

**文件**: `test/integration/points.service.spec.ts`

### 测试用例

#### 6.1 签到工作流

**测试场景**: 完整的签到流程

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 首次签到 | userId: 1 | 获得 10 积分，连续 1 天 | ✅ |
| 连续签到 | 连续第 4 天 | 获得 15 积分（10+5 奖励） | ✅ |
| 重复签到 | 当天已签到 | 抛出 '今日已签到' | ✅ |

**代码示例**:
```typescript
it('should complete full sign-in workflow', async () => {
  const result = await service.sign(1);

  expect(result.pointsEarned).toBe(10);
  expect(result.continuousDays).toBe(1);
  expect(mockUserService.updatePoints).toHaveBeenCalledWith(1, 10);
  expect(mockPointsLogRepository.save).toHaveBeenCalled();
  expect(mockRedisService.set).toHaveBeenCalledWith(
    'sign:1:2024-01-15',
    '1',
    24 * 60 * 60,
  );
});
```

**特点**:
- 使用 Redis 防止重复签到
- 支持连续签到奖励
- 自动记录积分日志

#### 6.2 积分交易流程

**测试场景**: 积分增加和消耗

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 增加积分 | amount: 50, type: PUBLISH | 积分增加 50，创建 EARN 日志 | ✅ |
| 消耗积分 | amount: -100, type: UNLOCK_CHAT | 积分减少 100，创建 CONSUME 日志 | ✅ |
| 默认描述 | 未提供 description | 使用默认描述 | ✅ |

**验证点**:
- 用户积分更新
- 创建积分日志
- 清除用户缓存

#### 6.3 余额计算

**测试场景**: 计算积分余额

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取余额 | userId: 1 | 返回当前余额、总收入、总支出 | ✅ |

**代码示例**:
```typescript
it('should calculate balance with earned and consumed totals', async () => {
  const result = await service.getBalance(1);

  expect(result).toEqual({
    balance: 2000,
    totalEarned: 1500,
    totalConsumed: 300,
  });
});
```

#### 6.4 积分日志

**测试场景**: 获取积分日志

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取所有日志 | userId: 1, page: 1 | 返回分页日志列表 | ✅ |
| 按类型过滤 | userId: 1, type: EARN | 返回收入日志 | ✅ |

#### 6.5 签到状态

**测试场景**: 检查签到状态

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 已签到 | userId: 1 | signedToday: true, continuousDays: 5 | ✅ |
| 未签到 | userId: 1 | signedToday: false, continuousDays: 0 | ✅ |

---

## 测试运行

### 运行所有集成测试

```bash
# 使用测试脚本
./test-staging.sh integration

# 使用 npm 命令
pnpm run test:staging:integration
```

### 运行特定模块测试

```bash
# 运行 AuthService 集成测试
pnpm run test test/integration/auth.service.spec.ts

# 运行 FriendService 集成测试
pnpm run test test/integration/friend.service.spec.ts
```

---

## Mock 策略

### 部分 Mock

集成测试使用部分 Mock 策略：

```typescript
// Mock 外部依赖
const mockUserService = {
  findById: jest.fn(),
  updatePoints: jest.fn(),
};

// 使用真实的业务逻辑
const module: TestingModule = await Test.createTestingModule({
  providers: [
    AuthService,  // 真实的 Service
    {
      provide: UserService,
      useValue: mockUserService,  // Mock 依赖
    },
  ],
}).compile();
```

### 真实数据库

部分集成测试使用真实数据库：

```typescript
// SquareService 使用 SQLite 内存数据库
TypeOrmModule.forRoot({
  type: 'sqlite',
  database: ':memory:',
  entities: [SquarePost, SquareComment, SquareLike, PostReport],
  synchronize: true,
  dropSchema: true,
})
```

---

## 最佳实践

### 1. 测试真实交互

集成测试应该测试模块间的真实交互：

```typescript
it('should complete full workflow', async () => {
  // Step 1: 执行第一个操作
  const result1 = await service.operation1();
  
  // Step 2: 验证中间状态
  expect(result1.status).toBe('pending');
  
  // Step 3: 执行第二个操作
  const result2 = await service.operation2(result1.id);
  
  // Step 4: 验证最终状态
  expect(result2.status).toBe('completed');
});
```

### 2. 验证副作用

验证操作的所有副作用：

```typescript
it('should update all related entities', async () => {
  await service.sendMessage(1, dto);
  
  // 验证消息保存
  expect(mockMessageRepository.save).toHaveBeenCalled();
  
  // 验证聊天次数更新
  expect(mockFriendService.updateChatCount).toHaveBeenCalledTimes(2);
  
  // 验证 WebSocket 推送
  expect(mockWsGateway.sendMessage).toHaveBeenCalledTimes(2);
});
```

### 3. 测试边界条件

测试各种边界条件和异常情况：

```typescript
it('should prevent invalid operations', async () => {
  mockFriendService.isFriend.mockResolvedValue(false);
  
  await expect(service.sendMessage(1, dto)).rejects.toThrow('请先解锁私聊');
  
  // 验证没有执行后续操作
  expect(mockMessageRepository.save).not.toHaveBeenCalled();
});
```

### 4. 清理测试数据

每个测试后清理数据：

```typescript
afterEach(async () => {
  await dataSource.getRepository(Entity).clear();
  jest.clearAllMocks();
});
```

---

## 相关文档

- [测试指南](./testing-guide.md)
- [单元测试用例](./unit-tests.md)
- [E2E 测试用例](./e2e-tests.md)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
