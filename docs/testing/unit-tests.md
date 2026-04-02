# 单元测试用例文档

## 概览

单元测试用于测试单个函数、类或模块的功能，不依赖外部服务（数据库、Redis 等），使用 Mock 对象模拟依赖。

---

## 1. UserService 单元测试

**文件**: `test/unit/user.service.spec.ts`

### 测试用例

#### 1.1 findById

**测试场景**: 根据 ID 查找用户

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 查找存在的用户 | userId: 1 | 返回用户对象 | ✅ |
| 查找不存在的用户 | userId: 999 | 抛出 NotFoundException | ✅ |

**代码示例**:
```typescript
it('should return a user when found', async () => {
  mockRepository.findOne.mockResolvedValue(mockUser);
  const result = await service.findById(1);
  expect(result).toEqual(mockUser);
});

it('should throw NotFoundException when user not found', async () => {
  mockRepository.findOne.mockResolvedValue(null);
  await expect(service.findById(999)).rejects.toThrow(NotFoundException);
});
```

#### 1.2 findByMobile

**测试场景**: 根据手机号查找用户

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 查找存在的用户 | mobile: '13800000001' | 返回用户对象 | ✅ |
| 查找不存在的用户 | mobile: '19999999999' | 返回 null | ✅ |

#### 1.3 updatePoints

**测试场景**: 更新用户积分

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 增加积分 | userId: 1, points: 100 | 积分增加 100 | ✅ |
| 减少积分 | userId: 1, points: -100 | 积分减少 100 | ✅ |
| 积分不能为负 | userId: 1, points: -3000 | 积分为 0 | ✅ |

#### 1.4 delete

**测试场景**: 软删除用户

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 删除用户 | userId: 1 | deletedAt 被设置 | ✅ |

---

## 2. CertificationService 单元测试

**文件**: `test/unit/certification.service.spec.ts`

### 测试用例

#### 2.1 create

**测试场景**: 创建认证申请

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 创建房产认证 | type: HOUSE | 创建成功，状态为 PENDING | ✅ |
| 创建学历认证 | type: EDUCATION | 创建成功，状态为 PENDING | ✅ |
| 创建身份证认证 | type: ID_CARD | 创建成功，状态为 PENDING | ✅ |

#### 2.2 getList

**测试场景**: 获取认证列表

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取所有认证 | userId: 1 | 返回所有认证列表 | ✅ |
| 按状态过滤 | userId: 1, status: PENDING | 返回待审核认证 | ✅ |

#### 2.3 approve

**测试场景**: 审核通过认证

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 审核通过 | id: 1, reviewerId: 1 | 状态变为 APPROVED | ✅ |
| 认证不存在 | id: 999 | 抛出 NotFoundException | ✅ |

#### 2.4 reject

**测试场景**: 拒绝认证

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 拒绝认证 | id: 1, reason: '照片不清晰' | 状态变为 REJECTED | ✅ |

---

## 3. FriendService 单元测试

**文件**: `test/unit/friend.service.spec.ts`

### 测试用例

#### 3.1 follow

**测试场景**: 关注用户

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 关注新用户 | userId: 1, friendId: 2 | 创建关注关系 | ✅ |
| 不能关注自己 | userId: 1, friendId: 1 | 抛出错误 | ✅ |
| 重复关注 | userId: 1, friendId: 2 | 抛出错误 | ✅ |

#### 3.2 unlockChat

**测试场景**: 解锁聊天

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 解锁聊天成功 | userId: 1, friendId: 2 | 状态变为 FRIEND，扣除积分 | ✅ |
| 积分不足 | userId: 1, friendId: 2 | 抛出错误 | ✅ |
| 聊天次数不足 | userId: 1, friendId: 2 | 抛出错误 | ✅ |

#### 3.3 blockUser

**测试场景**: 拉黑用户

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 拉黑用户 | userId: 1, blockedId: 2 | 创建拉黑记录 | ✅ |
| 不能拉黑自己 | userId: 1, blockedId: 1 | 抛出错误 | ✅ |

#### 3.4 getFriendList

**测试场景**: 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取好友列表 | userId: 1 | 返回好友列表 | ✅ |
| 空列表 | userId: 999 | 返回空数组 | ✅ |

---

## 4. SquareService 单元测试

**文件**: `test/unit/square.service.spec.ts`

### 测试用例

#### 4.1 createPost

**测试场景**: 创建帖子

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 创建文本帖子 | content: '测试内容' | 创建成功，获得积分 | ✅ |
| 创建图片帖子 | content: '测试', images: [...] | 创建成功 | ✅ |

#### 4.2 getPosts

**测试场景**: 获取帖子列表

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取最新帖子 | sort: 'latest' | 按时间倒序返回 | ✅ |
| 获取热门帖子 | sort: 'hot' | 按点赞数排序 | ✅ |
| 分页查询 |  limit: 10 | 返回第2页数据 | ✅ |

#### 4.3 toggleLike

**测试场景**: 点赞/取消点赞

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 点赞帖子 | userId: 1, postId: 1 | 点赞数+1 | ✅ |
| 取消点赞 | userId: 1, postId: 1 | 点赞数-1 | ✅ |

#### 4.4 createComment

**测试场景**: 创建评论

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 创建顶级评论 | postId: 1, content: '评论' | 创建成功 | ✅ |
| 创建回复 | postId: 1, parentId: 1 | 创建回复 | ✅ |

#### 4.5 deletePost

**测试场景**: 删除帖子

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 删除自己的帖子 | userId: 1, postId: 1 | 软删除成功 | ✅ |
| 删除他人帖子 | userId: 2, postId: 1 | 抛出权限错误 | ✅ |

---

## 5. ChatService 单元测试

**文件**: `test/unit/chat.service.spec.ts`

### 测试用例

#### 5.1 sendMessage

**测试场景**: 发送消息

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 发送文本消息 | senderId: 1, receiverId: 2, content: '你好' | 创建消息 | ✅ |
| 发送图片消息 | msgType: IMAGE, content: 'url' | 创建图片消息 | ✅ |
| 非好友发送 | senderId: 1, receiverId: 3 | 抛出错误 | ✅ |
| 被拉黑发送 | senderId: 1, receiverId: 2 | 抛出错误 | ✅ |

#### 5.2 getHistory

**测试场景**: 获取聊天历史

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取历史消息 | userId: 1, friendId: 2 | 返回消息列表 | ✅ |
| 分页查询 | limit: 20, beforeId: 100 | 返回指定页 | ✅ |

#### 5.3 getCon
**测试场景**: 获取会话列表

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取会话列表 | userId: 1 | 返回会话列表 | ✅ |
| 包含未读数 | userId: 1 | 每个会话包含未读数 | ✅ |

#### 5.4 markAsRead

**测试场景**: 标记已读

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 标记消息已读 | userId: 1, friendId: 2 | 消息标记为已读 | ✅ |

---

## 6. PointsService 单元测试

**文件**: `test/unit/points.service.spec.ts`

### 测试用例

#### 6.1 getBalance

**测试场景**: 获取积分余额

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取余额 | userId: 1 | 返回积分余额 | ✅ |
| 计算总收入 | userId: 1 | 返回总收入积分 | ✅ |
| 计算总支出 | userId: 1 | 返回总支出积分 | ✅ |

#### 6.2 addPoints

**测试场景**: 增加/减少积分

| 用例 | 输入 | 预期输出 | 状态 |
|--|------|---------|------|
| 赚取积分 | userId: 1, amount: 10, type: EARN | 积分增加 | ✅ |
| 消耗积分 | userId: 1, amount: 10, type: CONSUME | 积分减少 | ✅ |
| 创建日志 | userId: 1, amount: 10 | 创建积分日志 | ✅ |

#### 6.3 sign

**测试场景**: 签到

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 首次签到 | userId: 1 | 获得基础积分 | ✅ |
| 连续签到 | userId: 1 | 获得额外奖励 | ✅ |
| 重复签到 | userId: 1 | 抛出错误 | ✅ |

#### 6.4 getLogs

**测试场景**: 获取积分日志

| 用例 | 输入 | 预期输出 | 状态 |
|------|------|---------|------|
| 获取所有日志 | userId: 1 | 返回日志列表 | ✅ |
| 按类型过滤 | userId: 1, type: EARN | 返回收入日志 | ✅ |
| 分页查询 | page: 1, limit: 10 | 返回分页数据 | ✅ |

---

## 测试运行

### 运行所有单元测试

```bash
# 使用测试脚本
./test-staging.sh unit

# 使用 npm 命令
pnpm run test:staging:unit
```

### 运行特定模块测试

```bash
# 运行 UserService 测试
pnpm run test test/unit/user.service.spec.ts

# 运行 FriendService 测试
pnpm run test test/unit/friend.service.spec.ts
```

---

## Mock 对象说明

### Repository Mock

```typescript
const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
```

### Service Mock

```typescript
const mockUserS{
  findById: jest.fn(),
  findByMobile: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};
```

---

## 最佳实践

### 1. 测试隔离

每个测试用例应该独立运行，不依赖其他测试：

```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### 2. 使用描述性名称

```typescript
it('should return a user when found', async () => {
  // ...
});

it('should throw NotFoundException when user not found', async () => {
  // ...
});
```

### 3. AAA 模式

```typescript
it('should increase user points', async () => {
  // Arrange (准备)
  mockRepository.findOne.mockResolvedValue(mockUser);
  
  // Act (执行)
  const result = await service.updatePoints(1, 100);
  
  // Assert (断言)
  expect(result.points).toBe(2100);
});
```

---

## 相关文档

- [测试指南](./testing-guide.md)
- [集成测试用例](./integration-tests.md)
- [E2E 测试用例](./e2e-tests.md)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-02  
**维护者**: 开发团队
