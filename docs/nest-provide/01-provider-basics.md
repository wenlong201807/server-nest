# NestJS Provider 基础概念

## 什么是 Provider

Provider 是 NestJS 中的核心概念，它是一个可以被注入依赖的类。几乎所有的业务逻辑都应该委托给 Provider 来处理。

### Provider 的特点

1. **可注入性**：使用 `@Injectable()` 装饰器标记
2. **依赖管理**：由 NestJS IoC 容器自动管理生命周期
3. **解耦设计**：通过依赖注入实现松耦合架构
4. **可测试性**：便于进行单元测试和 Mock

## Provider 的类型

### 1. Service（服务）

最常见的 Provider 类型，封装业务逻辑。

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  private users = [];

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    return this.users.find(user => user.id === id);
  }

  create(user: any) {
    this.users.push(user);
    return user;
  }
}
```

### 2. Repository（仓储）

数据访问层，通常与 TypeORM 配合使用。

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
  ) {}

  async findById(id: number) {
    return this.repository.findOne({ where: { id } });
  }
}
```

### 3. Factory（工厂）

用于创建复杂对象或动态配置。

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class DatabaseFactory {
  createConnection(config: any) {
    // 根据配置创建数据库连接
    return new DatabaseConnection(config);
  }
}
```

### 4. Helper/Utility（辅助工具）

提供通用功能的工具类。

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class DateHelper {
  formatDate(date: Date): string {
    return date.toISOString();
  }

  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
```

## Provider 的注册

Provider 必须在模块中注册才能使用。

```typescript
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [UserService], // 注册 Provider
  exports: [UserService],   // 导出供其他模块使用
})
export class UserModule {}
```

## Provider 的作用域

### 1. DEFAULT（默认作用域）

单例模式，整个应用共享一个实例。

```typescript
@Injectable()
export class AppService {
  // 默认是单例
}
```

### 2. REQUEST（请求作用域）

每个请求创建一个新实例。

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
  // 每个请求都会创建新实例
}
```

### 3. TRANSIENT（瞬态作用域）

每次注入都创建新实例。

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {
  // 每次注入都创建新实例
}
```

## 实际项目案例：RedisService

从项目中的 `RedisService` 看 Provider 的实际应用：

```typescript
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {}

  connect(options: { host: string; port: number; password?: string }) {
    this.client = new Redis({
      host: options.host,
      port: options.port,
      password: options.password,
      db: 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Connected');
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string | number, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setJson(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
```

### RedisService 的特点

1. **封装性**：封装了 Redis 客户端的所有操作
2. **单例模式**：整个应用共享一个 Redis 连接
3. **类型安全**：提供了 Tpt 类型支持
4. **易用性**：提供了 JSON 序列化/反序列化的便捷方法

## 最佳实践

1. **单一职责**：每个 Provider 只负责一个明确的功能
2. **依赖注入**：通过构造函数注入依赖，而不是直接创建
3. **接口隔离**：定义清晰的接口，降低耦合度
4. **避免循环依赖**：合理设计模块结构
5. **使用 @Injectable()**：始终使用装饰器标记 Provider
