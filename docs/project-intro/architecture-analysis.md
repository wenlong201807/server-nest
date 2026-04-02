# WeTogether 项目架构分析

## 1. 整体架构设计

### 1.1 架构模式

项目采用 **分层架构 + 模块化设计**：

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│    (Controllers + WebSocket Gateway)    │
├─────────────────────────────────────────┤
│         Business Logic Layer            │
│            (Services)                   │
├─────────────────────────────────────────┤
│         Data Access Layer               │
│      (TypeORM Repositories)             │
├─────────────────────────────────────────┤
│         Infrastructure Layer            │
│  (MySQL + Redis + MinIO + WebSocket)    │
└─────────────────────────────────────────┘
```

### 1.2 核心模块划分

项目包含 9 个核心业务模块：

| 模块 | 职责 | 依赖 |
|------|------|------|
| **AuthModule** | 认证授权、JWT、短信验证 | UserModule, PointsModule, RedisService |
| **UserModule** | 用户管理、头像上传 | FileModule |
| **ProfileModule** | 用户资料、地理位置 | UserModule |
| **FriendModule** | 好友关系、黑名单 | UserModule |
| **ChatModule** | 聊天记录、会话管理 | WebSocketModule |
| **SquareModule** | 广场帖子、评论、点赞 | UserModule, FileModule |
| **PointsModule** | 积分系统、签到 | UserModule |
| **CertificationModule** | 实名认证审核 | UserModule, FileModule |
| **FileModule** | 文件上传、MinIO 管理 | MinIO Service |

### 1.3 公共模块 (CommonModule)

- **JWT 认证**: JwtStrategy + JwtAuthGuard
- **Redis 服务**: 缓存、验证码、会话
- **MinIO 服务**: 对象存储
- **装饰器**: @Public(), @CurrentUser()
- **拦截器**: TransformInterceptor (统一响应格式)
- **过滤器**: HttpExceptionFilter (统一异常处理)

## 2. 设计模式应用

### 2.1 依赖注入 (Dependency Injection)

NestJS 核心特性，所有模块通过构造函数注入依赖：

```typescript
@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private pointsService: PointsService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}
}
```

**优点**：
- 松耦合
- 易于测试（可注入 Mock）
- 依赖关系清晰

### 2.2 装饰器模式 (Decorator Pattern)

广泛使用装饰器：

```typescript
// 路由装饰器
@Controller('auth')
@ApiTags('auth')

// 方法装饰器
@Post('login')
@Public()
@ApiOperation({ summary: '登录' })

// 参数装饰器
@CurrentUser('sub') userId: number
```

### 2.3 守卫模式 (Guard Pattern)

全局 JWT 认证守卫：

```typescript
// app.module.ts
{ provide: APP_GUARD, useClass: JwtAuthGuard }

// 特定路由跳过认证
@Public()
@Post('login')
```

### 2.4 拦截器模式 (Interceptor Pattern)

统一响应格式：

```typescript
{
  code: 200,
  message: 'success',
  data: {...}
}
```

### 2.5 策略模式 (Strategy Pattern)

Passport 认证策略：

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: any) {
    return { userId: payload.sub, mobile: payload.mobile };
  }
}
```

## 3. 数据库设计

### 3.1 实体关系图

```
User (用户表)
  ├─ 1:1 → UserProfile (用户资料)
  ├─ 1:N → PointsLog (积分记录)
  ├─ 1:N → SquarePost (广场帖子)
  ├─ 1:N → SquareComment (评论)
  ├─ 1:N → Friendship (好友关系)
  ├─ 1:N → UserBlacklist (黑名单)
  ├─ 1:N → ChatMessage (聊天消息)
  ├─ 1:N → Certification (认证记录)
  └─ 1:N → FileRecord (文件记录)

SquarePost (帖子)
  ├─ 1:N → SquareComment (评论)
  ├─ 1:N → SquareLike (点赞)
  └─ 1:N → PostReport (举报)
```

### 3.2 核心表设计

**users 表**：
- 主键：id (自增)
- 唯一索引：mobile, inviteCode
- 普通索引：inviterCode, status, deletedAt
- 软删除：deletedAt

**friendships 表**：
- 复合索引：(userId, friendId)
- 状态字段：status (关注/好友/解锁私聊)

**chat_messages 表**：
- 复合索引：(senderId, receiverId, createdAt)
- 优化查询性能

### 3.3 TypeORM 配置

```typescript
TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type: 'mysql',
    synchronize: NODE_ENV !== 'production',
    logging: NODE_ENV === 'development',
    timezone: '+08:00',
    charset: 'utf8mb4',
  }),
})
```

## 4. 认证授权架构

### 4.1 JWT 认证流程

```
1. 用户登录 → AuthService.login()
2. 验证密码 → bcrypt.compare()
3. 生成 JWT → jwtService.sign(payload)
4. 返回 Token → { token, user }

后续请求：
1. 请求头携带 Token → Authorization: Bearer <token>
2. JwtAuthGuard 拦截 → 验证 Token
3. JwtStrategy.validate() → 解析 payload
4. 注入用户信息 → @CurrentUser() decorator
```

### 4.2 短信验证码机制

```typescript
// 1. 发送验证码
sms:code:{mobile} → { code, createdAt } (TTL: 5分钟)
sms:rate:{mobile} → "1" (TTL: 1分钟) // 频率限制

// 2. 验证码校验
- 检查是否过期
- 验证码匹配
- 验证后删除
```

### 4.3 权限控制

- **全局守卫**：所有接口默认需要认证
- **公开接口**：使用 `@Public()` 装饰器跳过认证
- **用户信息注入**：`@CurrentUser('sub')` 获取当前用户 ID

## 5. WebSocket 实时通信架构

### 5.1 WebSocket Gateway 设计

```typescript
@WebSocketGateway({ path: '/ws' })
export class ChatGateway {
  private userSocketMap = new Map<number, Set<WebSocket>>();
  
  // 连接时验证 JWT
  handleConnection(client: WebSocket, req: any) {
    const token = url.searchParams.get('token');
    const payload = this.jwtService.verify(token);
    this.userSocketMap.set(userId, client);
  }
  
  // 发送消息
  sendMessage(userId: number, message: any) {
    const sockets = this.userSocketMap.get(userId);
    sockets.forEach(socket => socket.send(data));
  }
}
```

### 5.2 消息推送机制

```
1. 用户 A 发送消息 → ChatController.sendMessage()
2. 保存到数据库 → ChatMessage Entity
3. 通过 WebSocket 推送 → ChatGateway.sendMessage(receiverId)
4. 用户 B 实时接收 → WebSocket client
```

### 5.3 连接管理

- **多设备支持**：一个用户可以有多个 WebSocket 连接
- **心跳检测**：ping/pong 机制保持连接
- **断线重连**：客户端自动重连

## 6. 文件存储架构

### 6.1 MinIO 对象存储

```typescript
@Injectable()
export class MinioService {
  async uploadFile(file: Buffer, fileName: string) {
    await this.client.putObject(bucket, fileName, file);
    return { filePath: fileName };
  }
  
  async generatePresignedUrl(filePath: string) {
    return this.client.presignedGetObject(bucket, filePath, 7 * 24 * 3600);
  }
}
```

### 6.2 文件上传流程

```
1. 客户端上传文件 → FileController.upload()
2. 保存到 MinIO → MinioService.uploadFile()
3. 记录到数据库 → FileRecord Entity
4. 返回文件路径 → { filePath, url }

访问文件：
1. 生成预签名 URL → MinioService.generatePresignedUrl()
2. 客户端直接访问 → 7天有效期
```

### 6.3 文件类型管理

- **头像**：type = 'avatar'
- **帖子图片**：type = 'post'
- **认证材料**：type = 'certification'

## 7. 缓存策略

### 7.1 Redis 使用场景

| 场景 | Key 格式 | TTL | 说明 |
|------|----------|-----|------|
| 短信验证码 | `sms:code:{mobile}` | 5分钟 | 验证码存储 |
| 发送频率限制 | `sms:rate:{mobile}` | 1分钟 | 防止频繁发送 |
| 用户会话 | `session:{userId}` | 7天 | 用户会话信息 |
| 签到记录 | `sign:{userId}:{date}` | 1天 | 签到状态缓存 |

### 7.2 缓存更新策略

- **Cache-Aside**：先查缓存，未命中则查数据库并更新缓存
- **Write-Through**：更新数据库的同时更新缓存
- **TTL 过期**：自动过期，减少缓存不一致

## 8. 架构优点

### 8.1 优点

1. **模块化设计**：职责清晰，易于维护
2. **依赖注入**：松耦合，易于测试
3. **统一响应格式**：前端处理简单
4. **全局异常处理**：错误处理一致
5. **JWT 认证**：无状态，易于扩展
6. **WebSocket 实时通信**：用户体验好
7. **对象存储**：文件管理高效
8. **Redis 缓存**：性能优化

### 8.2 可扩展性

- **水平扩展**：无状态设计，可部署多实例
- **微服务化**：模块独立，可拆分为微服务
- **消息队列**：可引入 RabbitMQ/Kafka 处理异步任务

## 9. 架构缺点与改进建议

### 9.1 当前问题

1. **缺少 API 版本控制**
   - 建议：引入 `/api/v1`, `/api/v2` 版本管理

2. **缺少日志系统**
   - 建议：集成 Winston 或 Pino 日志库

3. **缺少监控告警**
   - 建议：集成 Prometheus + Grafana

4. **缺少限流保护**
   - 建议：完善 ThrottlerModule 配置

5. **WebSocket 无集群支持**
   - 建议：使用 Redis Adapter 支持多实例

6. **缺少数据库读写分离**
   - 建议：配置主从复制，读写分离

7. **缺少消息队列**
   - 建议：引入 Bull (Redis-based) 处理异步任务

8. **缺少全链路追踪**
   - 建议：集成 OpenTelemetry

### 9.2 性能优化建议

1. **数据库优化**
   - 添加必要的索引
   - 使用连接池
   - 避免 N+1 查询

2. **缓存优化**
   - 热点数据缓存
   - 缓存预热
   - 缓存穿透保护

3. **接口优化**
   - 分页查询
   - 字段裁剪
   - 响应压缩

4. **WebSocket 优化**
   - 消息批量发送
   - 消息队列缓冲
   - 连接池管理

### 9.3 安全加固建议

1. **输入验证**：使用 class-validator 严格验证
2. **SQL 注入防护**：TypeORM 参数化查询
3. **XSS 防护**：前端输出转义
4. **CSRF 防护**：添加 CSRF Token
5. **敏感信息加密**：密码、Token 加密存储
6. **接口限流**：防止 DDoS 攻击
7. **日志脱敏**：敏感信息不记录日志

## 10. 技术债务

1. **TODO 未完成功能**
   - `AuthService.refreshToken()` 未实现
   - 短信服务未对接真实 API

2. **测试覆盖率低**
   - 缺少单元测试
   - 缺少集成测试
   - 缺少 E2E 测试

3. **文档不完善**
   - API 文档需要补充
   - 部署文档需要完善

## 11. 总结

WeTogether 项目采用了现代化的 NestJS 架构，整体设计合理，模块划分清晰。主要优点是依赖注入、统一响应格式、JWT 认证、WebSocket 实时通信等。

主要改进方向：
1. 完善监控日志系统
2. 优化数据库性能
3. 增强安全防护
4. 提高测试覆盖率
5. 支持集群部署

项目具备良好的扩展性，可以根据业务需求逐步演进为微服务架构。
