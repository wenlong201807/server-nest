# WeTogether 项目重构方案

## 1. 代码异味清单

### 1.1 高优先级问题

#### 问题 1：密码加密库混用风险
**位置**：`src/modules/auth/auth.service.ts:9`, `src/modules/user/user.service.ts:4`

**问题描述**：
代码中使用 `bcryptjs`，但 `package.json` 可能还包含 `bcrypt` 依赖，导致 Jenkins 构建失败。

**重构建议**：
```typescript
// 统一使用 bcryptjs
import * as bcrypt from 'bcryptjs';

// package.json 中移除 bcrypt
pnpm remove bcrypt
```

**优先级**：🔴 高
**预期收益**：解决构建失败问题
**风险**：低

---

#### 问题 2：未实现的 TODO 功能
**位置**：`src/modules/auth/auth.service.ts:130`

**问题描述**：
```typescript
async refreshToken(refreshToken: string) {
  // TODO: 实现refresh token逻辑
  return { token: 'new_token' };
}
```

**重构建议**：
```typescript
async refreshToken(refreshToken: string) {
  try {
    // 验证 refresh token
    const payload = this.jwtService.verify(refreshToken);
    
    // 检查用户状态
    const user = await this.userService.findById(payload.sub);
    if (!user || user.status !== 0) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    
    // 生成新的 access token
    return this.generateToken(user);
  } catch (error) {
    throw new UnauthorizedException('Token 无效或已过期');
  }
}
```

**优先级**：🔴 高
**预期收益**：完善认证机制，提升安全性
**风险**：低

---

#### 问题 3：短信服务未对接
**位置**：`src/modules/auth/auth.service.ts:40`

**问题描述**：
```typescript
// TODO: 调用短信服务发送验证码
console.log(`验证码: ${code}`); // 开发环境打印
```

**重构建议**：
```typescript
async sendSms(mobile: string) {
  // ... 前置检查 ...
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 根据环境选择发送方式
  if (this.configService.get('NODE_ENV') === 'production') {
    // 生产环境：调用真实短信服务
    await this.smsService.send(mobile, code);
  } else {
    // 开发环境：打印到日志
    this.logger.log(`[DEV] 验证码: ${code} (${mobile})`);
  }
  
  await this.redisService.setJson(key, { code, createdAt: Date.now() }, 300);
  return { message: '验证码已发送' };
}
```

**优先级**：🟡 中
**预期收益**：生产环境可用
**风险**：需要对接第三方服务

---

#### 问题 4：密码明文存储风险
**位置**：`src/modules/auth/auth.service.ts:135-144`

**问题描述**：
返回的 user 对象中删除了 password，但这是运行时操作，不够安全。

**重构建议**：
```typescript
// 方案 1：使用 class-transformer 的 @Exclude()
// user.entity.ts
@Exclude()
@Column({ type: 'varchar', length: 255 })
password: string;

// 方案 2：创建 DTO
export class UserResponseDto {
  id: number;
  mobile: string;
  nickname: string;
  // 不包含 password
}

private async generateToken(user: User) {
  const payload = { sub: user.id, mobile: user.mobile };
  const token = this.jwtService.sign(payload);
  
  // 使用 plainToClass 转换
  const userDto = plainToClass(UserResponseDto, user);
  return { token, user: userDto };
}
```

**优先级**：🔴 高
**预期收益**：提升安全性
**风险**：低

---

### 1.2 中优先级问题

#### 问题 5：重复的类型转换逻辑
**位置**：`src/modules/square/square.controller.ts:42-48`

**问题描述**：
多处使用 `parseInt(page, 10)` 进行类型转换，代码重复。

**重构前**：
```typescript
@Get('posts')
async getPosts(
  @Query('page') page: string = '1',
  @Query('pageSize') pageSize: string = '20',
) {
  const numPage = parseInt(page, 10) || 1;
  const numPageSize = parseInt(pageSize, 10) || 20;
  return this.squareService.getPosts(numPage, numPageSize);
}
```

**重构后**：
```typescript
// 创建自定义管道
@Injectable()
export class ParseIntWithDefaultPipe implements PipeTransform {
  constructor(private readonly defaultValue: number) {}
  
  transform(value: string): number {
    return parseInt(value, 10) || this.defaultValue;
  }
}

// 使用管道
@Get('posts')
async getPosts(
  @Query('page', new ParseIntWithDefaultPipe(1)) page: ner,
  @Query('pageSize', new ParseIntWithDefaultPipe(20)) pageSize: number,
) {
  return this.squareService.getPosts(page, pageSize);
}
```

**优先级**：🟡 中
**预期收益**：减少代码重复，提升可维护性
**风险**：低

---

#### 问题 6：魔法数字
**位置**：多处

**问题描述**：
代码中存在大量魔法数字，如 `300`（5分钟）、`60`（1分钟）、`2000`（初始积分）。

**重构建议**：
```typescript
// src/common/constants/index.ts
export const SMS_CODE_TTL = 300; // 5分钟
export const SMS_RATE_LIMIT_TTL = 60; // 1分钟
export const INITIAL_POINTS = 2000;
export const INVITE_REWARD_POINTS = 100;

// 使用常量
await this.redisService.setJson(key, { code, createdAt: Date.now() }, SMS_CODE_TTL);
await this.redisService.set(rateKey, '1', SMS_RATE_LIMIT_TTL);
await this.pointsService.addPoints(user.id, INITIAL_POINTS, PointsSourceType.REGISTER);
```

**优先级**：🟡 中
**预期收益**：提升代码可读性和可维护性
**风险**：低

---

#### 问题 7：缺少错误日志
**位置**：`src/modules/websocket/chat.gateway.ts:108`

**问题描述**：
WebSocket 发送消息失败时只记录错误，但没有记录详细上下文。

**重构建议**：
```typescript
sendMessage(userId: number, message: any) {
  const sockets = this.userSocketMap.get(userId);
  if (!sockets || sockets.size === 0) {
    this.logger.warn(`User ${userId} has no active connections`);
    return false;
  }
  
  const data = JSON.stringify(message);
  let successCount = 0;
  
  sockets.forEach(socket => {
    try {
      socket.send(data);
      successCount++;
    } catch (error) {
      this.logger.error(
        `Failed to send message to user ${userId}`,
        { error: error.message, messageType: message.type }
      );
    }
  });
  
  this.logger.debug(`Sent message to ${successCount}/${sockets.size} connections for user ${userId}`);
  return successCount > 0;
}
```

**优先级**：🟡 中
**预期收益**：便于问题排查
**风险**：低

---

#### 问题 8：缺少输入验证
**位置**：`src/modules/friend/friend.controller.ts:37`

**问题描述**：
用户可以关注自己，缺少业务逻辑验证。

**重构建议**：
```typescript
// friend.service.ts
async follow(userId: number, targetId: number) {
  // 验证：不能关注自己
  if (userId === targetId) {
    throw new BadRequestException('不能关注自己');
  }
  
  // 验证：目标用户是否存在
  const targetUser = await this.userService.findById(targetId);
  if (!targetUser) {
    throw new NotFoundException('目标用户不存在');
  }
  
  // 验证：是否已关注
  const existing = await this.friendshipRepo.findOne({
    where: { userId, friendId: targetId }
  });
  if (existing) {
    throw new BadRequestException('已经关注过该用户');
  }
  
  // ... 执行关注逻辑 ...
}
```

**优先级**：🟡 中
**预期收益**：提升数据完整性
**风险**：低

---

### 1.3 低优先级问题

#### 问题 9：命名不一致
**位置**：多处

**问题描述**：
- `userId` vs `user_id`
- `createdAt` vs `created_at`

**重构建议**：
统一使用 camelCase 命名：
```typescript
// 实体字段统一使用 camelCase
@Column({ name: 'user_id' })
userId: number;

@CreateDateColumn({ name: 'created_at' })
createdAt: Date;
```

**优先级**：🟢 低
**预期收益**：代码风格统一
**风险**：低

---

#### 问题 10：缺少注释
**位置**：多处

**问题描述**：
复杂业务逻辑缺少注释说明。

**重构建议**：
```typescript
/**
 * 解锁私聊功能
 * 
 * 业务规则：
 * 1. 双方必须互相关注
 * 2. 消耗 100 积分
 * 3. 解锁后可以发送私信
 * 
 * @param userId 当前用户 ID
 * @param targetId 目标用户 ID
 * @returns 解锁结果
 */
async unlockChat(userId: number, targetId: number) {
  // ... 实现 ...
}
```

**优先级**：🟢 低
**预期收益**：提升代码可读性
**风险**：无

---

## 2. SOLID 原则违反

### 2.1 单一职责原则 (SRP) 违反

**问题**：`UserController` 同时处理用户信息和头像上传

**重构建议**：
```typescript
// 拆分为两个 Controller
@Controller('user')
export class UserController {
  @Get('me')
  async getCurrentUser() { }
  
  @Put('me')
  async updateUser() { }
}

@Controller('user/avatar')
export class UserAvatarController {
  @Post()
  async uploadAvatar() { }
  
  @Delete()
  async deleteAvatar() { }
}
```

---

### 2.2 开闭原则 (OCP) 违反

**问题**：积分来源类型硬编码

**重构建议**：
```typescript
// 使用策略模式
interface PointsStrategy {
  calculate(context: any): number;
  getDescription(): string;
}

class RegisterPointsStrategy implements PointsStrategy {
  calculate() { return 2000; }
  getDescription() { return '注册赠送'; }
}

class InvitePointsStrategy implements PointsStrategy {
  calculate() { return 100; }
  getDescription() { return '邀请用户注册'; }
}

// PointsService
async addPoints(userId: number, strategy: PointsStrategy, relatedId?: number) {
  const points = strategy.calculate();
  const description = strategy.getDescription();
  // ... 执行添加积分逻辑 ...
}
```

---

## 3. 性能优化建议

### 3.1 数据库查询优化

#### 问题：N+1 查询
**位置**：`src/modules/square/square.service.ts`

**重构建议**：
```typescript
// 使用 eager loading
async getPosts(page: number, pageSize: number) {
  return this.postRepo.find({
    relations: ['user', 'user.profile'], // 一次性加载关联数据
    skip: (page - 1) * pageSize,
    take: pageSize,
    order: { createdAt: 'DESC' }
  });
}
```

---

### 3.2 缓存优化

**重构建议**：
```typescript
// 热点数据缓存
async getPost(id: number) {
  const cacheKey = `post:${id}`;
  
  // 先查缓存
  const cached = await this.redisService.getJson(cacheKey);
  if (cached) return cached;
  
  // 查数据库
  const post = await this.postRepo.findOne({ where: { id } });
  
  // 写入缓存（1小时）
  await this.redisService.setJson(cacheKey, post, 3600);
  
  return post;
}
```

---

## 4. 安全加固建议

### 4.1 SQL 注入防护

**当前状态**：✅ TypeORM 参数化查询已防护

**建议**：避免使用原生 SQL，如必须使用，务必参数化：
```typescript
// ❌ 危险
await this.repo.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ 安全
await this.repo.query('SELECT * FROM users WHERE id = ?', [userId]);
```

---

### 4.2 XSS 防护

**重构建议**：
```typescript
// 安装 xss 库
pnpm add xss

// 创建 XSS 过滤管道
@Injectable()
export class XssPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return xss(value);
    }
    return value;
  }
}

// 使用
@Post('posts')
async createPost(@Body(XssPipe) dto: CreatePostDto) { }
```

---

### 4.3 接口限流

**重构建议**：
```typescript
// 针对敏感接口单独限流
@Post('sms/send')
@Throttle({ default: { limit: 3, ttl: 60000 } }) // 1分钟3次
async sendSms() { }

@Post('login')
@Throttle({ default: { limit: 5, ttl: 300000 } }) // 5分钟5次
async login() { }
```

---

## 5. 重构优先级总结

### 🔴 高优先级（立即处理）
1. 修复 bcrypt/bcryptjs 混用问题
2. 实现 refreshToken 功能
3. 密码返回安全加固
4. 添加业务逻辑验证

### 🟡 中优先级（近期处理）
5. 消除代码重复（自定义管道）
6. 替换魔法数字为常量
7. 完善错误日志
8. 数据库查询优化

### 🟢 低优先级（长期优化）
9. 统一命名规范
10. 补充代码注释
11. 重构为策略模式
12. 完善缓存机制

---

## 6. 重构步骤规划

### 第一阶段：修复关键问题（1-2天）
- [ ] 修复 bcrypt 依赖问题
- [ ] 实现 refreshToken
- [ ] 密码安全加固
- [ ] 添加输入验证

### 第二阶段：代码质量提升（3-5天）
- [ ] 创建自定义管道
- [ ] 提取常量
- [ ] 完善日志
- [ ] 优化数据库查询

### 第三阶段：架构优化（1-2周）
- [ ] 引入策略模式
- [ ] 完善缓存机制
- [ ] 添加单元测试
- [ ] 性能压测优化

---

## 7. 风险评估

| 重构项 | 风险等级 | 影响范围 | 回滚难度 |
|--------|----------|----------|----------|
| bcrypt 修复 | 低 | 构建流程 | 容易 |
| refreshToken | 低 | 认证模块 | 容易 |
| 自定义管道 | 低 | Controller 层 | 容易 |
| 策略模式 | 中 | 积分模块 | 中等 |
| 缓存优化 | 中 | 全局 | 中等 |

---

## 8. 预期收益

### 代码质量
- 减少代码重复 30%
- 提升可维护性 40%
- 提升可测试性 50%

### 性能
- 数据库查询优化 20-30%
- 缓存命中率提升至 80%+
- 接口响应时间减少 30%

### 安全性
- 修复已知安全隐患
- 完善输入验证
- 增强日志审计能力

---

## 9. 总结

本重构方案从代码质量、性能、安全三个维度提出了改进建议。建议按照优先级逐步实施，每个阶段完成后进行充分测试，确保系统稳定性。
