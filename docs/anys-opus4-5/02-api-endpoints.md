# API 端点清单

## 认证模块 (Auth)

**基础路径**: `/api/v1/auth`  
**认证要求**: 公开接口（无需 Token）

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| POST | `/sms/send` | 发送验证码 | mobile |
| POST | `/register` | 用户注册 | mobile, password, smsCode, inviterCode? |
| POST | `/login` | 用户登录 | mobile, password |
| POST | `/refresh` | 刷新 Token | refreshToken |

---

## 用户模块 (User)

**基础路径**: `/api/v1/user`  
**认证要求**: 需要 JWT Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/me` | 获取当前用户信息 | - |
| PUT | `/me` | 更新用户信息 | nickname?, gender?, avatarUrl? |
| POST | `/avatar` | 上传头像 | filePath |

---

## 用户资料模块 (Profile)

**基础路径**: `/api/v1/profile`  
**认证要求**: 需要 JWT Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/:id` | 获取用户资料 | id (路径参数) |
| PUT | `/` | 更新用户资料 | realName?, birthDate?, hometown?, residence?, height?, weight?, occupation?, income?, education?, bio?, showLocation?, latitude?, longitude? |

---

## 广场模块 (Square)

**基础路径**: `/api/v1/square`  
**认证要求**: 需要 JWT Token

### 帖子相关

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| POST | `/posts` | 发布帖子 | content, images[] |
| GET | `/posts` | 获取帖子列表 | page?, pageSize?, sort? (latest/hot) |
| GET | `/posts/:id` | 获取帖子详情 | id (路径参数) |
| DELETE | `/posts/:id` | 删除帖子 | id (路径参数) |

### 评论相关

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| POST | `/comment` | 评论帖子 | postId, content, parentId?, replyToId? |
| GET | `/posts/:id/comments` | 获取评论列表 | id, page?, pageSize?, sort? (time/hot) |
| GET | `/comments/:id/replies` | 获取子评论 | id, page?, pageSize? |

### 互动相关

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| POST | `/like` | 点赞/取消点赞 | targetId, targetType (1=帖子, 2=评论) |
| POST | `/report` | 举报 | postId, reason, description? |

---

## 好友模块 (Friend)

**基础路径**: `/api/v1/friend`  
**认证要求**: 需要 JWT Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/list` | 获取好友列表 | - |
| GET | `/following` | 获取关注列表 | - |
| GET | `/status/:userId` | 获取好友状态 | userId (路径参数) |
| POST | `/follow` | 添加关注 | userId |
| POST | `/unlock-chat` | 解锁私聊 | userId (消耗积分) |
| DELETE | `/:userId` | 删除好友 | userId (路径参数) |
| POST | `/block` | 拉黑用户 | userId, reason? |
| GET | `/blocklist` | 获取黑名单 | - |

---

## 聊天模块 (Chat)

**基础路径**: `/api/v1/chat`  
**认证要求**: 需要 JWT Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| POST | `/send` | 发送消息 | receiverId, content, msgType (1=文本, 2=图片, 3=表情) |
| GET | `/history/:userId` | 获取聊天记录 | userId, page?, pageSize?, beforeId? |
| GET | `/conversations` | 获取会话列表 | - |
| PUT | `/read/:userId` | 标记已读 | userId (路径参数) |

---

## 积分模块 (Points)

**基础路径**: `/api/v1/points`  
**认证要求**: 需要 JWT Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/balance` | 获取积分余额 | - |
| POST | `/sign` | 签到 | - |
| GET | `/sign/status` | 获取签到状态 | - |
| GET | `/logs` | 获取积分流水 | page?, pageSize?, type? |

---

## 认证审核模块 (Certification)

**基础路径**: `/api/v1/certification`  
**认证要求**: 需要 JWT Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| POST | `/` | 提交认证 | type, imageUrl, description? |
| GET | `/list` | 获取认证列表 | status? |

---

## 认证类型模块 (Certification Type)

**基础路径**: `/api/v1/certification-type`  
**认证要求**: 需要 JWT Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/` | 获取认证类型列表 | - |
| GET | `/:id` | 获取认证类型详情 | id (路径参数) |

---

## 积分配置模块 (Points Config)

**基础路径**: `/api/v1/points-config`  
**认证要求**: 需要 JWT Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/` | 获取积分配置列表 | - |
| GET | `/:key` | 获取指定配置 | key (路径参数) |

---

## 系统配置模块 (System Config)

**基础路径**: `/api/v1/system-config`  
**认证要求**: 需要 JWT Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/` | 获取系统配置 | - |
| GET | `/:key` | 获取指定配置 | key (路径参数) |

---

## 文件管理模块 (File)

**基础路径**: `/api/v1/file`  
**认证要求**: 需要 JWT Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/config` | 获取文件配置 | - |
| POST | `/presigned-put` | 获取预签名上传 URL | filePath |
| POST | `/upload` | 上传文件记录 | filePath, originalName, mimeType, fileSize, type?, width?, height? |
| GET | `/:id` | 获取文件信息 | id (路径参数) |
| GET | `/:id/url` | 获取文件访问 URL | id (路径参数) |
| GET | `/my/list` | 获取我的文件列表 | page?, pageSize?, type? |
| DELETE | `/:id` | 删除文件 | id (路径参数) |

---

## 管理后台模块 (Admin)

**基础路径**: `/api/v1/admin`  
**认证要求**: 管理员 Token

### 认证相关

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| POST | `/auth/sms/send` | 发送管理员验证码 | mobile |
| POST | `/auth/login` | 管理员登录 | mobile, smsCode |
| POST | `/login22` | 登录22 (测试) | mobile, smsCode |

### 用户管理

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/users` | 用户列表 | page?, pageSize?, keyword?, status? |
| POST | `/users/:userId/points` | 调整积分 | userId, amount, reason |
| PUT | `/users/:userId/status` | 封禁/解封用户 | userId, status |

### 认证审核

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/certifications` | 审核列表 | page?, pageSize?, status? |
| PUT | `/certifications/:id/review` | 审核认证 | id, status, rejectReason? |

### 内容管理

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/posts` | 内容管理 | page?, pageSize?, status?, keyword? |
| DELETE | `/posts/:id` | 删除内容 | id, reason?, deductPoints? |

### 举报处理

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/reports` | 举报列表 | page?, pageSize?, status? |
| PUT | `/reports/:id/handle` | 处理举报 | id, action, deductPoints? |

### 系统配置

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/config` | 获取系统配置 | - |
| PUT | `/config` | 更新系统配置 | config (对象) |

### 数据统计

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/statistics` | 数据统计 | startDate?, endDate? |

---

## 管理员文件模块 (Admin File)

**基础路径**: `/api/v1/admin/file`  
**认证要求**: 管理员 Token

| 方法 | 路径 | 功能 | 参数 |
|------|------|------|------|
| GET | `/list` | 文件列表 | page?, pageSize?, type?, status? |
| PUT | `/:id/status` | 更新文件状态 | id, status |
| DELETE | `/:id` | 删除文件 | id (路径参数) |

---

## WebSocket 事件

**命名空间**: `/`  
**认证要求**: 需要 JWT Token (通过 query 参数传递)

### 客户端发送事件

| 事件名 | 功能 | 参数 |
|--------|------|------|
| `sendMessage` | 发送消息 | receiverId, content, msgType |
| `joinRoom` | 加入房间 | roomId |
| `leaveRoom` | 离开房间 | roomId |

### 服务端推送事件

| 事件名 | 功能 | 数据 |
|--------|------|------|
| `newMessage` | 新消息通知 | message 对象 |
| `messageRead` | 消息已读通知 | userId, messageIds[] |
| `userOnline` | 用户上线 | userId |
| `userOffline` | 用户下线 | userId |

---

## 响应格式

### 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 响应数据
  }
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "错误信息",
  "error": "详细错误"
}
```

### 分页响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 认证方式

### JWT Bearer Token

```http
Authorization: Bearer <token>
```

### Token 获取

1. 通过 `/auth/login` 登录获取
2. Token 有效期: 7 天
3. 可通过 `/auth/refresh` 刷新

### 公开接口

以下接口无需 Token:
- `/auth/*` - 所有认证相关接口
- `/admin/auth/*` - 管理员认证接口
- `/admin/login22` - 测试登录接口

---

## 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（Token 无效或过期） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器内部错误 |
