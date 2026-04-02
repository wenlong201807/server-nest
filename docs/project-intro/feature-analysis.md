# WeTogether 项目功能深度解析

## 1. 认证模块 (Auth Module)

### 1.1 核心功能

#### 短信验证码功能
**流程**：
```
1. 用户请求发送验证码 → POST /api/v1/auth/sms/send
2. 检查发送频率限制 (Redis: sms:rate:{mobile})
3. 生成 6 位随机验证码
4. 存储到 Redis (TTL: 5分钟)
5. 调用短信服务发送 (TODO: 未对接真实 API)
6. 设置频率限制 (1分钟内只能发送1次)
```

**关键代码位置**：
- `src/modules/auth/auth.service.ts:22-44`

**数据流转**：
```
Request → AuthController → AuthService → RedisService
                                      → SMS Provider (未实现)
```

---

#### 用户注册功能
**流程**：
```
1. 验证短信验证码 (Redis 查询)
2. 检查手机号是否已注册
3. 生成唯一邀请码 (nanoid)
4. 密码加密 (bcryptjs)
5. 创建用户记录
6. 赠送初始积分 (2000分)
7. 处理邀请人奖励 (100分)
8. 生成 JWT Token
9. 返回 Token 和用户信息
```

**关键代码位置**：
- `src/modules/auth/auth.service.ts:46-109`
- `src/modules/user/user.service.ts:create()`
- `src/modules/points/points.service.ts:addPoints()`

**数据流转**：
```
Request → AuthController
       → AuthService
       → RedisService (验证码验证)
       → UserService (创建用户)
       → PointsService (赠送积分)
       → JwtService (生成 Token)
       → Response
```

**业务规则**：
- 验证码有效期：5分钟
- 初始积分：2000分
- 邀请奖励：100分
- 邀请码：8位大写字母数字

---

#### 用户登录功能
**流程**：
```
1. 根据手机号查询用户
2. 检查用户状态 (是否被禁用)
3. 验证密码 (bcrypt.compare)
4. 生成 JWT Token
5. 返回 Token 和用户信息 (不含密码)
```

**关键代码位置**：
- `src/modules/auth/auth.service.ts:112-128`

**JWT Payload**：
```typescript
{
  sub: user.id,        // 用户 ID
  mobile: user.mobile, // 手机号
  nickname: user.nickname
}
```

---

### 1.2 认证机制

#### JWT 认证流程
```
1. 用户登录成功 → 生成 JWT Token
2. 客户端存储 Token
3. 后续请求携带 Token (Authorization: Bearer <token>)
4. JwtAuthGuard 拦截请求
5. JwtStrategy 验证 Token
6. 解析 payload 注入到 request.user
7. Controller 通过 @CurrentUser() 获取用户信息
```

**关键代码位置**：
- `src/common/jwt/jwt.strategy.ts` - JWT 验证策略
- `src/common/guards/jwt-auth.guard.ts` - 全局守卫
- `src/common/decorators/user.decorator.ts` - 用户信息装饰器
- `src/common/decorators/public.decorator.ts` - 公开接口装饰器

---

## 2. 用户模块 (User Module)

### 2.1 核心功能

#### 获取当前用户信息
**流程**：
```
1. 从 JWT Token 中获取 userId
2. 查询用户信息
3. 如果有头像，生成预签名 URL (7天有效期)
4. 返回用户信息
```

**关键代码位置**：
- `src/modules/user/user.controller.ts:25-33`

---

#### 更新用户信息
**流程**：
```
1. 接收更新数据 (nickname, gender 等)
2. 更新数据库
3. 返回更新结果
```

**可更新字段**：
- nickname (昵称)
- gender (性别)
- avatarUrl (头像 URL)
- avatarPath (头像路径)

---

#### 头像上传功能
**流程**：
```
1. 客户端先上传文件到 MinIO → 获取 filePath
2. 调用 POST /api/v1/user/avatar
3. 创建文件记录 (file_record 表)
4. 生成预签名访问 URL (7天有效期)
5. 更新用户头像路径
6. 返回文件信息和访问 URL
```

**关键代码位置**：
- `src/modules/user/user.controller.ts:41-75`
- `src/modules/file/file.service.ts`

**数据流转**：
```
Client → MinIO (直接上传)
      → POST /api/v1/user/avatar { filePath }
      → FileService.create() (记录文件)
      → FileService.generatePresignedUrl() (生成 URL)
      → UserService.update() (更新头像)
      → Response { id, filePath, url }
```

---

### 2.2 用户资料模块 (Profile Module)

**实体关系**：
- User (1:1) UserProfile

**资料字段**：
- realName (真实姓名)
- birthDate (出生日期)
- hometown (家乡)
- residence (居住地)
- height (身高)
- weight (体重)
- occupation (职业)
- income (收入)
- education (学历)
- bio (个人简介)
- latitude/longitude (地理位置)
- showLocation (是否显示位置)

---

## 3. 好友模块 (Friend Module)

### 3.1 核心功能

#### 好友关系状态
```typescript
enum FriendshipStatus {
  FOLLOWING = 0,    // 单向关注
  FRIEND = 1,       // 双向好友
  UNLOCKED_CHAT = 2 // 解锁私聊
}
```

#### 关注功能
**流程**：
```
1. 检查是否已关注
2. 创建关注记录 (status = FOLLOWING)
3. 检查对方是否也关注了自己
4. 如果是，双方状态更新为 FRIEND
5. 返回关注结果
```

**关键代码位置**：
- `src/modules/friend/friend.service.ts:follow()`

---

#### 解锁私聊功能
**业务规则**：
- 必须双方互为好友 (status = FRIEND)
- 消耗 100 积分
- 解锁后可以发送私信

**流程**：
```
1. 检查是否为好友关系
2. 检查积分是否足够
3. 扣除 100 积分
4. 更新好友状态为 UNLOCKED_CHAT
5. 返回解锁结果
```

**关键代码位置**：
- `src/modules/friend/friend.service.ts:unlockChat()`

---

#### 黑名单功能
**流程**：
```
1. 创建黑名单记录
2. 删除好友关系 (如果存在)
3. 阻止对方发送消息
4. 阻止对方查看资料
```

**关键代码位置**：
- `src/modules/friend/friend.service.ts:blockUser()`

---

### 3.2 数据库设计

**friendships 表**：
```sql
CREATE TABLE friendships (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId BIGINT,
  friendId BIGINT,
  status TINYINT DEFAULT 0,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  INDEX idx_user_friend (userId, friendId)
);
```

**blacklist 表**：
```sql
CREATE TABLE user_blacklist (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId BIGINT,
  blockedUserId BIGINT,
  reason VARCHAR(255),
  createdAt TIMESTAMP
);
```

---

## 4. 聊天模块 (Chat Module)

### 4.1 WebSocket 实时通信

#### 连接建立流程
```
1. 客户端连接 ws://host/ws?token=<jwt_token>
2. ChatGateway 验证 JWT Token
3. 解析 userId
4. 存储到 userSocketMap (支持多设备)
5. 发送连接成功消息
6. 监听 message 事件
```

**关键代码位置**：
- `src/modules/websocket/chat.gateway.ts:31-77`

**连接管理**：
```typescript
private userSocketMap = new Map<number, Set<WebSocket>>();
// 一个用户可以有多个 WebSocket 连接（多设备）
```

---

#### 消息发送流程
```
1. 用户 A 调用 POST /api/v1/chat/send
2. ChatService 保存消息到数据库
3. 通过 WebSocketGatewayService 推送消息
4. ChatGateway 查找用户 B 的所有连接
5. 向所有连接发送消息
6. 用户 B 实时接收消息
```

**关键代码位置**：
- `src/modules/chat/chat.controller.ts:15-19`
- `src/modules/chat/chat.service.ts:s`
- `src/modules/websocket/chat.gateway.ts:101-113`

**数据流转**：
```
User A → POST /api/v1/chat/send
      → ChatService.sendMessage()
      → ChatMessage Entity (保存到数据库)
      → WebSocketGatewayService.sendMessage()
      → ChatGateway.sendMessage(userId, message)
      → WebSocket.send() (推送给 User B)
      → User B 实时接收
```

---

#### 消息类型
```typescript
enum MsgType {
  TEXT = 0,    // 文本消息
  IMAGE = 1,   // 图片消息
  VOICE = 2,   // 语音消息
  VIDEO = 3    // 视频消息
}
```

---

#### 聊天记录查询
**功能**：
- 分页查询 (page, pageSize)
- 游标分页 (beforeId)
- 按时间倒序

**关键代码位置**：
- `src/modules/chat/chat.controller.ts:21-31`
- `src/modules/chat/chat.service.ts:getHistory()`

---

#### 会话列表
**功能**：
- 显示所有聊天会话
- 最后一条消息
- 未读消息数量
- 按最后消息时间排序

**关键代码位置**：
- `src/modules/chat/chat.controller.ts:33-37`

---

### 4.2 消息已读机制
**流程**：
```
1. 用户打开聊天窗口
2. 调用 PUT /api/v1/chat/read/:userId
3. 更新所有未读消息为已读
4. 返回更新结果
```

---

## 5. 广场模块 (Square Module)

### 5.1 核心功能

#### 发布帖子
**流程**：
```
1. 接收帖子内容和图片
2. 创建帖子记录
3. 关联用户信息
4. 返回帖子详情
```

**关键代码位置**：
- `src/modules/square/square.controller.ts:30-37`

**帖子字段**：
- content (文本内容)
- images (图片数组，JSON 格式)
- likeCount (点赞数)
- commentCount (评论数)
- status (状态：正常/隐藏/删除)

---

#### 获取帖子列表
**功能**：
- 分页查询
- 排序方式：latest (最新) / hot (热门)
- 关联用户信息

**流程**：
```
1. 根据排序方式查询
2. 分页返回
3. 包含用户信息 (eager loading)
```

**关键代码位置**：
- `src/modules/square/square.controller.ts:39-49`

---

#### 评论功能
**流程**：
```
1. 创建评论记录
2. 更新帖子评论数 +1
3. 支持回复评论 (parentId)
4. 返回评论详情
```

**评论结构**：
```
Post (帖子)
  └─ Comment (一级评论)
       └─ Comment (二级评论 - 回复)
```

**关键代码位置**：
- `src/modules/square/square.controller.ts:82-89`

---

#### 点赞功能
**流程**：
```
1. 检查是否已点赞
2. 如果已点赞 → 取消点赞 (删除记录，点赞数 -1)
3. 如果未点赞 → 添加点赞 (创建记录，点赞数 +1)
4. 返回点赞状态
```

**关键代码位置**：
- `src/modules/square/square.controller.ts:107-111`

**数据库设计**：
```sql
CREATE TABLE square_likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId BIGINT,
  targetId BIGINT,
  targetType TINYINT, -- 0: 帖子, 1: 评论
  createdAt TIMESTAMP,
  UNIQUE KEY uk_user_target (userId, targetId, targetType)
);
```

---

#### 举报功能
**流程**：
```
1. 创建举报记录
2. 记录举报原因
3. 待管理员审核
```

**举报类型**：
- 垃圾广告
- 色情低俗
- 违法违规
- 侵权
- 其他

---

### 5.2 数据流转图

```
发布帖子：
User → POST /api/v1/square/posts
    → SquareService.createPost()
    → SquarePost Entity (保存)
    → Response

点赞：
User → POST /api/v1/square/like
    → SquareService.toggleLike()
    → 检查 SquareLike 是否存在
    → 存在：删除 + 点赞数 -1
    → 不存在：创建 + 点赞数 +1
    → Response

评论：
User → POST /api/v1/square/comment
    → SquareService.createComment()
    → SquareComment Entity (保存)
    → SquarePost.commentCount +1
    → Response
```

---

## 6. 积分模块 (Points Module)

### 6.1 核心功能

#### 积分来源类型
```typescript
enum PointsSourceType {
  REGISTER = 0,      // 注册赠送 (2000分)
  INVITE = 1,        // 邀请奖励 (100分)
  SIGN = 2,          // 每日签到 (10分)
  POST = 3,          // 发布帖子 (5分)
  COMMENT = 4,       // 评论 (2分)
  LIKE = 5,          // 点赞 (1分)
  UNLOCK_CHAT = -100 // 解锁私聊 (-100分)
}
```

---

#### 每日签到功能
**流程**：
```
1. 检查今日是否已签到 (Redis 缓存)
2. 如果已签到 → 返回错误
3. 如果未签到 → 添加积分 (10分)
4. 创建签到记录
5. 缓存签到状态 (TTL: 1天)
6. 返回签到结果
```

**关键代码位置**：
- `src/modules/points/points.service.ts:sign()`

**Redis Key**：
```
sign:{userId}:{date} → "1" (TTL: 1天)
```

---

#### 积分流水查询
**功能**：
- 分页查询
- 按类型筛选
- 按时间倒序

**关键代码位置**：
- `src/modules/points/points.controller.ts:32-41`

---

### 6.2 积分系统设计

**points_log 表**：
```sql
CREATE TABLE points_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId BIGINT,
  points INT,              -- 积分变动（正数增加，负数减少）
  sourceType TINYINT,      -- 来源类型
  relatedId BIGINT,        -- 关联 ID（如帖子 ID、用户 ID）
  description VARCHAR(255), -- 描述
  createdAt TIMESTAMP,
  INDEX idx_user_created (userId, createdAt)
);
```

---

## 7. 认证模块 (Certification Module)

### 7.1 核心功能

#### 提交认证
**流程**：
```
1. 上传认证材料 (身份证、学历证书等)
2. 创建认证记录
3. 状态：待审核
4. 等待管理员审核
```

**认证类型**：
- 实名认证
- 学历认证
- 职业认证
- 收入认证

**关键代码位置**：
- `src/modules/certification/certification.controller.ts:15-19`

---

#### 认证状态
```typescript
enum CertificationStatus {
  PENDING = 0,   // 待审核
  APPROVED = 1,  // 已通过
  REJECTED = 2   // 已拒绝
}
```

---

## 8. 文件模块 (File Module)

### 8.1 MinIO 对象存储

#### 文件上传流程
```
1. 客户端调用 POST /api/v1/file/upload
2. 接收文件 (multipart/form-data)
3. 生成唯一文件名 (nanoid + 时间戳)
4. 上传到 MinIO
5. 创建文件记录
6. 返回文件路径和访问 URL
```

**关键代码位置**：
- `src/modules/file/file.controller.ts`
- `src/common/minio/minio.service.ts`

---

#### 预签名 URL 机制
**目的**：临时访问私有文件

**流程**：
```
1. 调用 MinIO.presignedGetObject()
2. 生成临时访问 URL (有效期 7天)
3. 客户端使用 URL 直接访问文件
4. 过期后需要重新生成
```

**关键代码位置**：
- `src/common/minio/minio.service.ts:generatePresignedUrl()`

---

### 8.2 文件记录管理

**file_record 表**：
```sql
CREATE TABLE file_record (
  id INT PRIMARY KEY AUTO_INCREMENT,
  filePath VARCHAR(500),      -- 文件路径
  fileName VARCHAR(255),      -- 文件名
  originalName VARCHAR(255),  -- 原始文件名
  mimeType VARCHAR(100),      -- MIME 类型
  fileExt VARCHAR(20),        -- 文件扩展名
  fileSize BIGINT,            -- 文件大小
  uploadUserId BIGINT,        -- 上传用户
  uploadNickname VARCHAR(50), -- 上传用户昵称
  type VARCHAR(50),           -- 文件类型 (avatar/post/certification)
  status TINYINT DEFAULT 1,   -- 状态
  createdAt TIMESTAMP
);
```

---

## 9. 管理后台模块 (Admin Module)

### 9.1 核心功能

- 用户管理（查询、禁用、删除）
- 帖子管理（审核、删除）
- 举报处理
- 认证审核
- 系统配置
- 积分配置

---

## 10. 模块间交互关系

```
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                         │
│              (Controllers + Guards)                     │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
   │  Auth   │      │  User   │      │ Friend  │
   │ Service │◄────►│ Service │◄────►│ Service │
   └────┬────┘      └────┬────┘      └────┬────┘
        │                │                 │
        │           ┌────▼────┐            │
        │           │ Points  │            │
        └──────────►│ Service │◄───────────┘
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐      ┌───▼────┐      ┌───▼────┐
   │  Chat   │      │ Square │      │  File  │
   │ Service │      │Service │      │Service │
   └────┬────┘      └────────┘      └────────┘
        │
   ┌────▼────────┐
   │  WebSocket  │
   │   Gateway   │
   └─────────────┘
```

---

## 11. 关键业务流程总结

### 11.1 用户注册完整流程
```
1. 发送验证码 → Redis 存储
2. 提交注册信息 → 验证验证码
3. 创建用户 → 生成邀请码
4. 赠送初始积分 (2000分)
5. 处理邀请人奖励 (100分)
6. 生成 JWT Token
7. 返回用户信息
```

### 11.2 发帖并获得积分流程
```
1. 用户发布帖子 → SquareService
2. 保存帖子 → SquarePost Entity
3. 触发积分奖励 → PointsService
4. 添加积分 (5分) → PointsLog Entity
5. 更新用户积分 → User.points +5
```

### 11.3 解锁私聊流程
```
1. 检查好友关系 → 必须互为好友
2. 检查积分 → 至少 100分
3. 扣除积分 → PointsService
4. 更新好友状态 → UNLOCKED_CHAT
5. 允许发送私信
```

### 11.4 实时聊天流程
```
1. 用户 A 连接 WebSocket (携带 JWT)
2. 用户 B 连接 WebSocket
3. 用户 A 发送消息 → POST /api/v1/chat/send
4. 保存到数据库 → ChatMessage
5. 通过 WebSocket 推送给用户 B
6. 用户 B 实时接收消息
```

---

## 12. 功能完整性评估

### ✅ 已完成功能
- 用户注册/登录
- JWT 认证
- 用户资料管理
- 好友关系管理
- 实时聊天
- 广场帖子/评论/点赞
- 积分系统
- 文件上传
- 认证提交

### ⚠️ 待完善功能
- refreshToken 未实现
- 短信服务未对接真实 API
- WebSocket 集群支持
- 消息推送通知
- 搜索功能
- 推荐算法

### 🔧 需要优化
- 数据库查询性能 (N+1 问题)
- 缓存策略
- 接口限流
- 日志系统
- 监控告警

---

## 13. API 接口清单

### 认证模块
- POST /api/v1/auth/sms/send - 发送验证码
- POST /api/v1/auth/register - 注册
- POST /api/v1/auth/login - 登录
- POST /api/v1/auth/refresh - 刷新 Token

### 用户模块
- GET /api/v1/user/me - 获取当前用户
- PUT /api/v1/user/me - 更新用户信息
- POST /api/v1/user/avatar - 上传头像

### 好友模块
- GET /api/v1/friend/list - 好友列表
- GET /api/v1/friend/following - 关注列表
- GET /api/v1/friend/status/:userId - 好友状态
- POST /api/v1/friend/follow - 添加关注
- POST /api/v1/friend/unlock-chat - 解锁私聊
- DELETE /api/v1/friend/:userId - 删除好友
- POST /api/v1/friend/block - 拉黑用户
- GET /api/v1/friend/blocklist - 黑名单

### 聊天模块
- POST /api/v1/chat/send - 发送消息
- GET /api/v1/chat/history/:userId - 聊天记录
- GET /api/v1/chat/conversations - 会话列表
- PUT /api/v1/chat/read/:userId - 标记已读

### 广场模块
- POST /api/v1/square/posts - 发布帖子
- GET /api/v1/square/posts - 帖子列表
- GET /api/v1/square/posts/:id - 帖子详情
- DELETE /api/v1/square/posts/:id - 删除帖子
- POST /api/v1/square/comment - 评论
- GET /api/v1/square/posts/:id/comments - 评论列表
- POST /api/v1/square/like - 点赞/取消点赞
- POST /api/v1/square/report - 举报

### 积分模块
- GET /api/v1/points/balance - 积分余额
- POST /api/v1/points/sign - 每日签到
- GET /api/v1/points/sign/status - 签到状态
- GET /api/v1/points/logs - 积分流水

### 认证模块
- POST /api/v1/certification - 提交认证
- GET /api/v1/certification/list - 认证列表

---

## 14. 总结

WeTogether 项目实现了一个完整的相亲社交平台的核心功能，包括：

**核心亮点**：
1. 完善的认证授权机制 (JWT + Guards)
2. 实时通信 (WebSocket)
3. 积分激励系统
4. 好友关系管理
5. 社交广场功能

**技术特点**：
1. 模块化设计，职责清晰
2. 依赖注入，易于测试
3. 统一响应格式
4. 全局异常处理
5. Redis 缓存优化

**改进方向**：
1. 完善 TODO 功能
2. 优化数据库查询
3. 增强安全防护
4. 提高测试覆盖率
5. 完善监控日志

项目整体架构合理，功能完整，具备良好的扩展性。
