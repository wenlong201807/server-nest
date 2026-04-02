# WeTogether 相亲网站后端服务

WeTogether 是一个基于 NestJS 的现代化相亲社交平台后端服务，提供用户认证、社交广场、好友系统、实时聊天等核心功能。

## 项目概述

本项目采用 NestJS 框架构建，使用 TypeORM 进行数据库操作，Redis 缓存，WebSocket 实现实时通信，MinIO 对象存储管理文件。

## 技术栈

### 核心框架
- **NestJS** 10.3.0 - 渐进式 Node.js 框架
- **TypeScript** 5.3.3 - 类型安全的 JavaScript 超集
- **Node.js** 20+ - 运行时环境

### 数据库与缓存
- **MySQL** 3.6.5 - 关系型数据库
- **TypeORM** 0.3.19 - ORM 框架
- **Redis** (ioredis 5.3.2) - 缓存与会话管理

### 认证与安全
- **Passport** 0.7.0 - 认证中间件
- **JWT** (@nestjs/jwt 10.2.0) - Token 认证
- **bcryptjs** 3.0.3 - 密码加密

### 实时通信
- **Socket.io** 4.6.1 - WebSocket 实时通信
- **ws** 8.20.0 - WebSocket 客户端

### 文件存储
- **MinIO** 7.1.3 - 对象存储服务

### API 文档
- **Swagger** (@nestjs/swagger 11.2.6) - API 文档生成

### 其他工具
- **class-validator** 0.14.1 - 数据验证
- **class-transformer** 0.5.1 - 数据转换
- **nanoid** 3.3.7 - 唯一 ID 生成

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- MySQL >= 8.0
- Redis >= 6.0
- MinIO 或兼容的对象存储服务

### 安装依赖

```bash
pnpm install
```

### 环境配置

复制环境变量模板文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量（详见[环境变量配置](#环境变量配置)）。

### 数据库迁移

```bash
# 运行数据库迁移
pnpm run migration:run

# 生成新的迁移文件
pnpm run migration:generate -- src/database/migrations/MigrationName
```

### 启动服务

```bash
# 开发环境
pnpm run start:dev

# Staging 环境
pnpm run start:staging

# 生产环境
pnpm run start:prod

# 生产环境（编译后）
pnpm run build
pnpm run start:prod:build
```

### 访问服务

- API 服务: http://localhost:9201
- Swagger 文档: http://localhost:9201/api/docs
- 健康检查: http://localhost:9201/api/v1/health

## 项目结构

```
server-nest/
├── src/
│   ├── common/              # 公共模块
│   │   ├── constants/       # 常量定义
│   │   ├── decorators/      # 自定义装饰器
│   │   ├── filters/         # 异常过滤器
│   │   ├── guards/          # 守卫
│   │   ├── interceptors/    # 拦截器
│   │   ├── jwt/             # JWT 认证
│   │   ├── redis/           # Redis 服务
│   │   └── minio/           # MinIO 服务
│   ├── modules/             # 业务模块
│   │   ├── auth/            # 认证模块
│   │   ├── user/            # 用户模块
│   │   ├── profile/         # 用户资料模块
│   │   ├── friend/          # 好友模块
│   │   ├── chat/            # 聊天模块
│   │   ├── square/          # 广场模块
│   │   ├── points/          # 积分模块
│   │   ├── certification/   # 认证模块
│   │   ├── file/            # 文件模块
│   │   ├── admin/           # 管理后台
│   │   └── websocket/       # WebSocket 网关
│   ├── database/            # 数据库配置
│   ├── health/              # 健康检查
│   ├── app.module.ts        # 根模块
│   └── main.ts              # 应用入口
├── docs/                    # 项目文档
├── scripts/                 # 脚本文件
├── nginx/                   # Nginx 配置
├── .env.example             # 环境变量模板
├── ecosystem.config.js      # PM2 配置
├── Jenkinsfile              # Jenkins CI/CD
└── package.json             # 项目配置
```

## 核心功能模块

### 认证模块 (Auth)
- 手机号注册/登录
- 短信验证码
- JWT Token 认证
- Token 刷新机制

### 用户模块 (User)
- 用户信息管理
- 头像上传
- 个人资料编辑
- 邀请码系统

### 好友模块 (Friend)
- 关注/取消关注
- 好友列表
- 解锁私聊
- 黑名单管理

### 聊天模块 (Chat)
- 实时消息推送
- 聊天记录查询
- 会话列表
- 消息已读状态

### 广场模块 (Square)
- 发布帖子
- 评论/回复
- 点赞功能
- 举报机制

### 积分模块 (Points)
- 积分余额查询
- 每日签到
- 积分流水记录
- 积分消费/获取

### 认证模块 (Certification)
- 实名认证
- 学历认证
- 职业认证
- 认证审核

## 环境变量配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | 运行环境 | development |
| PORT | 服务端口 | 9201 |
| API_PREFIX | API 前缀 | api/v1 |
| ALLOWED_ORIGINS | 允许的跨域源 | - |
| DB_HOST | 数据库地址 | 127.0.0.1 |
| DB_PORT | 数据库端口 | 3307 |
| DB_USERNAME | 数据库用户名 | root |
| DB_PASSWORD | 数据库密码 | - |
| DB_DATABASE | 数据库名称 | together_dev |
| REDIS_HOST | Redis 地址 | localhost |
| REDIS_PORT | Redis 端口 | 6381 |
| JWT_SECRET | JWT 密钥 | - |
| JWT_EXPIRES_IN | Token 过期时间 | 7d |
| RUSTFS_DOMAIN | 对象存储域名 | http://localhost:9002 |
| RUSTFS_BUCKET | 存储桶名称 | test-one |
| RUSTFS_ACCESS_KEY | 访问密钥 | - |
| RUSTFS_SECRET_KEY | 密钥 | - |

详细配置说明请参考 `.env.example` 文件。

## 开发指南

详见 [DEVELOPMENT.md](./DEVELOPMENT.md)

## API 文档

详见 [API.md](./API.md)

## 数据库设计

详见 [DATABASE.md](./DATABASE.md)

## 部署指南

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 脚本命令

```bash
# 开发
pnpm run start:dev          # 启动开发服务器
pnpm run build              # 构建生产版本

# 测试
pnpm run test               # 运行单元测试
pnpm run test:e2e           # 运行端到端测试
pnpm run test:cov           # 生成测试覆盖率

# 代码质量
pnpm run lint               # 代码检查
pnpm run format             # 代码格式化

# 数据库
pnpm run migration:generate # 生成迁移文件
pnpm run migration:run      # 运行迁移
pnpm run migration:revert   # 回滚迁移
```

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系开发团队。
