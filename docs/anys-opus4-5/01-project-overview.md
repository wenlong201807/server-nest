# WeTogether 相亲平台 - 项目概览

## 项目基本信息

**项目名称**: WeTogether 相亲网站后端 API 服务  
**技术栈**: NestJS + TypeORM + MySQL + Redis + WebSocket  
**版本**: 1.0.0  
**Node 版本**: 20.10.0  
**包管理器**: pnpm  

## 项目统计

- **模块数量**: 17 个业务模块
- **TypeScript 文件**: 89 个
- **控制器**: 14 个
- **实体**: 17 个数据库表
- **代码行数**: 约 3000+ 行

## 技术架构

### 核心技术栈

```
NestJS 10.3.0          - 后端框架
TypeORM 0.3.19         - ORM 框架
MySQL 8.0              - 关系型数据库
Redis (ioredis 5.3.2)  - 缓存和会话
Socket.IO 4.6.1        - WebSocket 实时通信
JWT (passport-jwt)     - 身份认证
Bcrypt 5.1.1          - 密码加密
Swagger                - API 文档
```

### 项目结构

```
server-nest/
├── src/
│   ├── common/              # 公共模块
│   │   ├── constants/       # 常量定义
│   │   ├── decorators/      # 自定义装饰器
│   │   ├── filters/         # 异常过滤器
│   │   ├── guards/          # 守卫
│   │   └── interceptors/    # 拦截器
│   ├── modules/             # 业务模块
│   │   ├── auth/           # 认证模块
│   │   ├── user/           # 用户模块
│   │   ├── profile/        # 用户资料
│   │   ├── square/         # 广场（帖子）
│   │   ├── friend/         # 好友关系
│   │   ├── chat/           # 聊天消息
│   │   ├── points/         # 积分系统
│   │   ├── certification/  # 认证审核
│   │   ├── admin/          # 管理后台
│   │   ├── file/           # 文件管理
│   │   └── ...
│   ├── app.module.ts       # 根模块
│   └── main.ts             # 入口文件
├── scripts/
│   └── init-database.sh    # 数据库初始化脚本
├── Jenkinsfile             # CI/CD 配置
├── docker-compose.yml      # Docker 编排
└── package.json
```

## 核心功能模块

### 1. 用户系统
- 手机号注册/登录
- JWT Token 认证
- 用户资料管理
- 头像上传

### 2. 社交广场
- 发布帖子（文字+图片）
- 评论/回复
- 点赞功能
- 举报机制

### 3. 好友系统
- 关注/取消关注
- 解锁私聊（消耗积分）
- 好友列表
- 黑名单管理

### 4. 聊天系统
- 实时消息（WebSocket）
- 聊天记录
- 会话列表
- 已读/未读状态

### 5. 积分系统
- 签到获取积分
- 积分消费（解锁私聊）
- 积分流水记录
- 积分配置管理

### 6. 认证审核
- 多种认证类型（房产、学历、身份证等）
- 提交认证材料
- 管理员审核

### 7. 管理后台
- 用户管理（封禁/解封）
- 内容审核
- 举报处理
- 数据统计
- 系统配置

### 8. 文件管理
- 对象存储集成（RustFS）
- 预签名 URL 上传
- 文件记录管理

## 部署架构

### 多环境支持

```
开发环境 (dev)     - 端口 8118, MySQL 3307, Redis 6383
预发布 (staging)   - 端口 8119, MySQL 3308, Redis 6384
生产环境 (prod)    - 端口 8120, MySQL 3309, Redis 6382
```

### CI/CD 流程

```
Jenkins Pipeline:
1. 拉取代码
2. 安装依赖 (pnpm)
3. 构建项目 (pnpm build)
4. 检查依赖服务 (MySQL/Redis/RustFS)
5. 数据库初始化
6. 停止旧服务
7. 启动新服务 (PM2)
8. 健康检查
```

### Docker 容器化

- Jenkins 运行在 Docker 容器内
- 使用 `host.docker.internal` 访问宿主机服务
- MySQL/Redis 通过 Docker Compose 管理

## 数据库设计

### 核心表结构

```
users              - 用户基本信息
user_profiles      - 用户详细资料
friendships        - 好友关系
chat_messages      - 聊天消息
square_posts       - 广场帖子
square_comments    - 帖子评论
square_likes       - 点赞记录
post_reports       - 举报记录
certifications     - 认证记录
certification_type - 认证类型
points_logs        - 积分流水
points_config      - 积分配置
sign_records       - 签到记录
user_blacklist     - 黑名单
user_violations    - 违规记录
system_config      - 系统配置
file_record        - 文件记录
```

## API 设计

### RESTful 风格

- 使用标准 HTTP 方法 (GET/POST/PUT/DELETE)
- 统一响应格式
- JWT Bearer Token 认证
- Swagger 文档自动生成

### API 前缀

```
/api/v1/auth/*        - 认证相关
/api/v1/user/*        - 用户相关
/api/v1/square/*      - 广场相关
/api/v1/friend/*      - 好友相关
/api/v1/chat/*        - 聊天相关
/api/v1/points/*      - 积分相关
/api/v1/admin/*       - 管理后台
```

## 安全机制

1. **密码加密**: Bcrypt 加密存储
2. **JWT 认证**: 7 天有效期
3. **全局守卫**: JwtAuthGuard 保护所有接口
4. **公开接口**: @Public() 装饰器标记
5. **限流保护**: ThrottlerModule (60s/100 次)
6. **参数验证**: class-validator + class-transformer
7. **异常处理**: 全局异常过滤器

## 性能优化

1. **数据库索引**: 关键字段建立索引
2. **Redis 缓存**: 会话和热点数据缓存
3. **分页查询**: 所有列表接口支持分页
4. **软删除**: 使用 deletedAt 字段
5. **连接池**: TypeORM 连接池管理

## 项目特色

1. **完整的社交功能**: 广场、好友、聊天一体化
2. **积分经济系统**: 激励用户活跃度
3. **多重认证机制**: 提升用户真实性
4. **实时通信**: WebSocket 支持即时消息
5. **管理后台**: 完善的内容审核和用户管理
6. **多环境部署**: 开发/预发布/生产环境隔离
7. **自动化部署**: Jenkins Pipeline 自动化流程

## 下一步优化方向

1. 添加单元测试和 E2E 测试
2. 实现消息队列（处理异步任务）
3. 添加日志系统（ELK）
4. 实现分布式 Session
5. 添加监控告警（Prometheus + Grafana）
6. 优化数据库查询性能
7. 实现 API 版本控制
8. 添加 GraphQL 支持
