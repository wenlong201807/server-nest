# NestJS 注入作用域基础

详细梳理nestjs的注入作用域用法，与实战场景，面试高频问题与答案。将结果生成到docs/nest-scope/\*.md中

## 什么是注入作用域（Injection Scope）

注入作用域决定了 Provider 实例的生命周期和共享方式。NestJS 提供了三种作用域：

1. **DEFAULT（默认作用域）** - 单例模式
2. **REQUEST（请求作用域）** - 每个请求创建新实例
3. **TRANSIENT（瞬态作用域）** - 每次注入创建新实例

## 三种作用域详解

### 1. DEFAULT 作用域（单例模式）

**特点：**

- 整个应用生命周期内只创建一个实例
- 所有请求共享同一个实例
- 性能最好，内存占用最少
- 默认作用域，无需显式声明

**语法：**

```typescript
import { Injectable } from '@nestjs/common';

// 方式 1：默认就是 DEFAULT 作用域
@Injectable()
export class UserService {
  private counter = 0;

  increment() {
    this.counter++;
    return this.counter;
  }
}

// 方式 2：显式声明
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.DEFAULT })
export class UserService {
  // ...
}
```

**特性演示：**

```typescript
@Injectable()
export class CounterService {
  private count = 0;

  increment() {
    this.count++;
    console.log(`Count: ${this.count}`);
    return this.count;
  }
}

@Controller('test')
export class TestController {
  constructor(private counterService: CounterService) {}

  @Get('count')
  getCount() {
    return this.counterService.increment();
  }
}

// 访问 /test/count 多次：
// 第一次：Count: 1
// 第二次：Count: 2
// 第三次：Count: 3
// 所有请求共享同一个实例
```

**适用场景：**

- 无状态服务（大部分业务逻辑）
- 数据库连接池
- 缓存服务
- 配置服务
- 工具类服务

### 2. REQUEST 作用域（请求作用域）

**特点：**

- 每个 HTTP 请求创建一个新实例
- 请求结束后实例被销毁
- 可以访问请求上下文
- 性能开销较大

**语法：**

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
  private requestId: string;

  constructor() {
    this.requestId = Math.random().toString(36).substring(7);
    console.log(`Created instance: ${this.requestId}`);
  }

  getRequestId() {
    return this.requestId;
  }
}
```

**特性演示：**

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestCounterService {
  private count = 0;

  increment() {
    this.count++;
    console.log(`Request Count: ${this.count}`);
    return this.count;
  }
}

@Controller('test')
export class TestController {
  constructor(private counterService: RequestCounterService) {}

  @Get('count')
  getCount() {
    return this.counterService.increment();
  }
}

// 访问 /test/count 多次：
// 第一次：Request Count: 1
// 第二次：Request Count: 1
// 第三次：Request Count: 1
// 每个请求都是新实例，计数器重置
```

**注入请求对象：**

```typescript
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class RequestService {
  constructor(@Inject(REQUEST) private request: Request) {}

  getUserAgent() {
    return this.request.headers['user-agent'];
  }

  getRequestUrl() {
    return this.request.url;
  }

  getClientIp() {
    return this.request.ip;
  }
}
```

**适用场景：**

- 需要访问请求上下文（headers, cookies, session）
- 请求级别的日志追踪
- 多租户应用（根据请求确定租户）
- 请求级别的缓存
- 审计日志

### 3. TRANSIENT 作用域（瞬态作用域）

**特点：**

- 每次注入都创建新实例
- 不同注入点获得不同实例
- 实例不共享
- 性能开销最大

**语法：**

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {
  private instanceId: string;

  constructor() {
    this.instanceId = Math.random().toString(36).substring(7);
    console.log(`Created transient instance: ${this.instanceId}`);
  }

  getInstanceId() {
    return this.instanceId;
  }
}
```

**特性演示：**

```typescript
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  private instanceId = Math.random().toString(36).substring(7);

  log(message: string) {
    console.log(`[${this.instanceId}] ${message}`);
  }
}

@Injectable()
export class UserService {
  constructor(private logger: LoggerService) {
    this.logger.log('UserService created');
  }
}

@Injectable()
export class OrderService {
  constructor(private logger: LoggerService) {
    this.logger.log('OrderService created');
  }
}

// 输出：
// [abc123] UserService created
// [def456] OrderService created
// 每个注入点都有独立的 LoggerService 实例
```

**适用场景：**

- 需要完全隔离的实例
- 每次使用都需要全新状态
- 插件系统
- 策略模式实现
- 临时对象创建

## 作用域对比

| 特性           | DEFAULT        | REQUEST        | TRANSIENT   |
| -------------- | -------------- | -------------- | ----------- |
| 实例数量       | 1个            | 每个请求1个    | 每次注入1个 |
| 生命周期       | 应用启动到关闭 | 请求开始到结束 | 注入时创建  |
| 内存占用       | 最少           | 中等           | 最多        |
| 性能           | 最好           | 中等           | 最差        |
| 状态共享       | 全局共享       | 请求内共享     | 不共享      |
| 访问请求上下文 | ❌             | ✅             | ❌          |
| 推荐使用       | ✅ 默认选择    | ⚠️ 特定场景    | ⚠️ 特殊需求 |

## 作用域的传播

**重要规则：** 如果一个 Provider 依赖了 REQUEST 或 TRANSIENT 作用域的 Provider，它自己也会变成相应的作用域。

```typescript
// LoggerService 是 REQUEST 作用域
@Injectable({ scope: Scope.REQUEST })
export class LoggerService {
  log(message: string) {
    console.log(message);
  }
}

// UserService 依赖 LoggerService
// UserService 自动变成 REQUEST 作用域
@Injectable()
export class UserService {
  constructor(private logger: LoggerService) {}
}

// OrderService 依赖 UserService
// OrderService 也自动变成 REQUEST 作用域
@Injectable()
export class OrderService {
  constructor(private userService: UserService) {}
}
```

**作用域传播链：**

```
DEFAULT → DEFAULT ✅
DEFAULT → REQUEST ❌ (DEFAULT 会被提升为 REQUEST)
DEFAULT → TRANSIENT ❌ (DEFAULT 会被提升为 TRANSIENT)
REQUEST → REQUEST ✅
REQUEST → TRANSIENT ❌ (REQUEST 会被提升为 TRANSIENT)
TRANSIENT → TRANSIENT ✅
```

## 在 Controller 中使用

Controller 也可以设置作用域：

```typescript
import { Controller, Scope } from '@nestjs/common';

// REQUEST 作用域的 Controller
@Controller({
  path: 'users',
  scope: Scope.REQUEST,
})
export class UserController {
  constructor(
    @Inject(REQUEST) private request: Request,
    private userService: UserService,
  ) {}

  @Get()
  getUsers() {
    const userId = this.request.user?.id;
    return this.userService.findAll(userId);
  }
}
```

## 性能影响

### DEFAULT 作用域（推荐）

```typescript
// ✅ 性能最好
@Injectable()
export class CacheService {
  private cache = new Map();

  set(key: string, value: any) {
    this.cache.set(key, value);
  }

  get(key: string) {
    return this.cache.get(key);
  }
}
```

### REQUEST 作用域（谨慎使用）

```typescript
// ⚠️ 每个请求都创建新实例，性能开销大
@Injectable({ scope: Scope.REQUEST })
export class RequestLoggerService {
  constructor(@Inject(REQUEST) private request: Request) {}

  log(message: string) {
    console.log(`[${this.request.url}] ${message}`);
  }
}

// 性能影响：
// - 每个请求都需要创建实例
// - 依赖注入容器需要重新解析依赖
// - 内存分配和垃圾回收开销
```

### TRANSIENT 作用域（极少使用）

```typescript
// ⚠️ 每次注入都创建新实例，性能开销最大
@Injectable({ scope: Scope.TRANSIENT })
export class TemporaryService {
  private data = [];

  addData(item: any) {
    this.data.push(item);
  }
}

// 性能影响：
// - 多次注入会创建多个实例
// - 内存占用成倍增加
// - 实例之间无法共享状态
```

## 最佳实践

### 1. 默认使用 DEFAULT 作用域

```typescript
// ✅ 推荐：大部分服务使用默认作用域
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }
}
```

### 2. 需要请求上下文时使用 REQUEST 作用域

```typescript
// ✅ 合理使用：需要访问请求信息
@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  constructor(@Inject(REQUEST) private request: Request) {}

  async logAction(action: string) {
    await this.auditRepository.save({
      action,
      userId: this.request.user?.id,
      ip: this.request.ip,
      userAgent: this.request.headers['user-agent'],
      timestamp: new Date(),
    });
  }
}
```

### 3. 避免在 REQUEST 作用域中存储大量数据

```typescript
// ❌ 不推荐：在 REQUEST 作用域中缓存大量数据
@Injectable({ scope: Scope.REQUEST })
export class BadCacheService {
  private cache = new Map(); // 每个请求都创建新的 Map

  async getData(key: string) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const data = await this.fetchData(key);
    this.cache.set(key, data);
    return data;
  }
}

// ✅ 推荐：使用 DEFAULT 作用域 + Redis
@Injectable()
export class GoodCacheService {
  constructor(private redisService: RedisService) {}

  async getData(key: string) {
    const cached = await this.redisService.get(key);
    if (cached) return JSON.parse(cached);

    const data = await this.fetchData(key);
    await this.redisService.set(key, JSON.stringify(data), 3600);
    return data;
  }
}
```

### 4. 使用 TRANSIENT 作用域要谨慎

```typescript
// ❌ 不推荐：不必要的 TRANSIENT 作用域
@Injectable({ scope: Scope.TRANSIENT })
export class CalculatorService {
  add(a: number, b: number) {
    return a + b;
  }
}

// ✅ 推荐：无状态服务使用 DEFAULT 作用域
@Injectable()
export class CalculatorService {
  add(a: number, b: number) {
    return a + b;
  }
}
```

## 常见错误

### 错误 1：在 DEFAULT 作用域中存储请求相关状态

```typescript
// ❌ 错误：多个请求会互相干扰
@Injectable()
export class BadUserService {
  private currentUserId: number; // 危险！

  setCurrentUser(userId: number) {
    this.currentUserId = userId;
  }

  getCurrentUser() {
    return this.currentUserId; // 可能返回其他请求的用户ID
  }
}

// ✅ 正确：使用 REQUEST 作用域或参数传递
@Injectable({ scope: Scope.REQUEST })
export class GoodUserService {
  constructor(@Inject(REQUEST) private request: Request) {}

  getCurrentUser() {
    return this.request.user;
  }
}

// ✅ 或者通过参数传递
@Injectable()
export class BetterUserService {
  getUserData(userId: number) {
    return this.userRepository.findOne({ where: { id: userId } });
  }
}
```

### 错误 2：过度使用 REQUEST 作用域

```typescript
// ❌ 不必要的 REQUEST 作用域
@Injectable({ scope: Scope.REQUEST })
export class MathService {
  add(a: number, b: number) {
    return a + b;
  }
}

// ✅ 无状态服务使用 DEFAULT
@Injectable()
export class MathService {
  add(a: number, b: number) {
    return a + b;
  }
}
```

## 总结

1. **DEFAULT 作用域**：默认选择，性能最好，适用于大部分场景
2. **REQUEST 作用域**：需要访问请求上下文时使用，注意性能影响
3. **TRANSIENT 作用域**：极少使用，仅在需要完全隔离的场景
4. **作用域会传播**：依赖高作用域的 Provider 会被提升
5. **性能优先**：优先使用 DEFAULT，避免不必要的 REQUEST/TRANSIENT
6. **状态管理**：DEFAULT 作用域不要存储请求相关状态
