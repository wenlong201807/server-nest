# NestJS Provider 高级模式

## 动态模块与 Provider

动态模块允许在运行时配置 Provider，非常适合需要配置的可重用模块。

### 实际案例：RedisModule

从项目中的 `RedisModule` 看动态配置：

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global() // 全局模块，无需在每个模块中导入
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {
  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    // 在模块构造函数中初始化 Redis 连接
    this.redisService.connect({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379'),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
    });
  }
}
```

### 更灵活的动态模块模式

```typescript
import { Module, DynamicModule } from '@nestjs/common';

export interface RedisModuleOptions {
  host: string;
  port: number;
  password?: string;
}

@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: 'REDIS_OPTIONS',
          useValue: options,
        },
        RedisService,
      ],
      exports: [RedisService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<RedisModuleOptions> | RedisModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: 'REDIS_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        RedisService,
      ],
      exports: [RedisService],
    };
  }
}

// 使用方式
@Module({
  imports: [
    // 同步配置
    RedisModule.forRoot({
      host: 'localhost',
      port: 6379,
    }),
    
    // 异步配置
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## 全局 Provider

### @Global() 装饰器

使模块成为全局模块，其导出的 Provider 在整个应用中可用。

```typescript
import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [RedisService, LoggerService],
  exports: [RedisService, LoggerService],
})
export class CommonModule {}
```

### 实际项目案例：AppModule 中的全局 Provider

```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    // ... 其他模块
  ],
  providers: [
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // 全局响应拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // 全局 JWT 守卫
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

## 异步 Provider

### useFactory 异步模式

适用于需要异步初始化的 Provider。

```typescript
@Module({
  providers: [
    {
      provide: 'ASYNC_CONNECTION',
      useFactory: async () => {
        const connection = await createConnection();
        return connection;
      },
    },
  ],
})
export class DatabaseModule {}
```

### 实际案例：TypeORM 异步配置

从项目的 `AppModule` 中看 TypeORM 的异步配置：

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [
          User,
          UserProfile,
          Certification,
          // ... 更多实体
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        timezone: '+08:00',
        charset: 'utf8mb4',
      }),
      inject: [ConfigService], // 注入 ConfigService
    }),
  ],
})
export class AppModule {}
```

## 条件 Provider

根据条件动态注册不同的 Provider。

```typescript
import { Module } from '@nestjs/common';

const cacheProvider = {
  provide: 'CACHE_SERVICE',
  useClass: process.env.NODE_ENV === 'production' 
    ? RedisCacheService 
    : MemoryCacheService,
};

@Module({
  providers: [cacheProvider],
  exports: ['CACHE_SERVICE'],
})
export class CacheModule {}
```

## 多 Provider 注入

### 使用数组注入多个实现

```typescript
// 定义接口
interface PaymentProcessor {
  process(amount: number): Promise<void>;
}

// 实现类
@Injectable()
class AlipayProcessor implements PaymentProcessor {
  async process(amount: number) {
    console.log(`Alipay: ${amount}`);
  }
}

@Injectable()
class WechatPayProcessor implements PaymentProcessor {
  async process(amount: number) {
    console.log(`WechatPay: ${amount}`);
  }
}

// 注册
@Module({
  providers: [
    AlipayProcessor,
    WechatPayProcessor,
    {
      provide: 'PAYMENT_PROCESSORS',
      useFactory: (alipay: AlipayProcessor, wechat: WechatPayProcessor) => {
        return [alipay, wechat];
      },
      inject: [AlipayProcessor, WechatPayProcessor],
    },
  ],
})
export class PaymentModule {}

// 使用
@Injectable()
export class PaymentService {
  constructor(
    @Inject('PAYMENT_PROCESSORS')
    private processors: PaymentProcessor[],
  ) {}

  async processPayment(method: string, amount: number) {
    const processor = this.processors.find(p => p.constructor.name.includes(method));
    await processor.process(amount);
  }
}
```

## 可选依赖

使用 `@Optional()` 装饰器标记可选依赖。

```typescript
import { Injectable, Optional } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    private database: DatabaseService,
    @Optional() private logger?: LoggerService, // 可选依赖
  ) {}

  async findUser(id: number) {
    this.logger?.log(`Finding user ${id}`); // 安全调用
    return this.database.findOne(id);
  }
}
```

## 自定义 Provider 工厂

### 复杂对象创建

```typescript
@Module({
  providers: [
    {
      provide: 'HTTP_CLIENT',
      useFactory: (configService: ConfigService) => {
        const timeout = configService.get('HTTP_TIMEOUT');
        const retries = configService.get('HTTP_RETRIES');
        
        return axios.create({
          timeout,
          retry: retries,
          headers: {
            'User-Agent': 'MyApp/1.0',
          },
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class HttpModule {}
```

### 带清理逻辑的 Provider

```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private connection: any;

  async connect() {
    this.connection = await createConnection();
  }

  async onModuleDestroy() {
    // 模块销毁时清理资源
    await this.connection.close();
  }
}
```

## Provider 继承

### 基类 Provider

```typescript
@Injectable()
export abstract class BaseService<T> {
  constructor(
    @InjectRepository(Entity)
    protected repository: Repository<T>,
  ) {}

  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  async findOne(id: number): Promise<T> {
    return this.repository.findOne({ where: { id } });
  }
}

// 继承使用
@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
    private emailService: EmailService,
  ) {
    super(repository);
  }

  async createUser(data: CreateUserDto) {
    const user = await this.repository.save(data);
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}
```

## 装饰器组合

### 自定义注入装饰器

```typescript
import { Inject } from '@nestjs/common';

export const InjectRedis = () => Inject('REDIS_CLIENT');
export const InjectLogger = () => Inject('LOGGER');

// 使用
@Injectable()
export class CacheService {
  constructor(
    @InjectRedis() private redis: Redis,
    @InjectLogger() private logger: Logger,
  ) {}
}
```

## 实战案例：多层依赖注入

从项目中看完整的依赖链：

```typescript
// 1. 底层服务：RedisService
@Injectable()
export class RedisService {
  private client: Redis;
  
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
}

// 2. 中间层服务：UserService
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private redisService: RedisService, // 注入 RedisService
  ) {}

  async findById(id: number): Promise<User> {
    // 先查缓存
    const cached = await this.redisService.get(`user:${id}`);
    if (cached) return JSON.parse(cached);

    // 查数据库
    const user = await this.userRepository.findOne({ where: { id } });
    
    // 写缓存
    await this.redisService.set(`user:${id}`, JSON.stringify(user), 3600);
    
    return user;
  }
}

// 3. 业务层服务：FriendService
@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    private userService: UserService, // 注入 UserService
    private pointsService: PointsService,
  ) {}

  async unlockChat(userId: number, targetId: number) {
    // 使用 UserService（它内部使用了 RedisService）
    const user = await this.userService.findById(userId);
    
    if (user.points < 50) {
      throw new BadRequestException('积分不足');
    }

    // 扣除积分
    await this.pointsService.addPoints(userId, -50, PointsSourceType.UNLOCK_CHAT);

    // 更新好友关系
    const friendship = await this.friendshipRepository.findOne({
      where: { userId, friendId: targetId },
    });
    
    friendship.status = FriendStatus.FRIEND;
    await this.friendshipRepository.save(friendship);

    return { unlocked: true };
  }
}

// 4. 控制器层：FriendController
@Controller('friend')
export class FriendController {
  constructor(
    private friendService: FriendService, // 注入 FriendService
  ) {}

  @Post('unlock-chat')
  async unlockChat(
    @CurrentUser('sub') userId: number,
    @Body('userId') targetId: number,
  ) {
    return this.friendService.unlockChat(userId, targetId);
  }
}
```

### 依赖关系图

```
FriendController
    ↓
FriendService
    ↓ ↓ ↓
    ↓ ↓ PointsService
    ↓ UserService
    ↓     ↓
    ↓     RedisService
    ↓
FriendshipRepository
```

## 性能优化

### 1. 懒加载 Provider

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class LazyService {
  constructor(private moduleRef: ModuleRef) {}

  async doSomething() {
    // 懒加载 HeavyService
    const heavyService = await this.moduleRef.create(HeavyService);
    return heavyService.process();
  }
}
```

### 2. 缓存 Provider 结果

```typescript
@Injectable()
export class ConfigService {
  private cache = new Map<string, any>();

  get(key: string): any {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const value = process.env[key];
    this.cache.set(key, value);
    return value;
  }
}
```

## 最佳实践总结

1. **使用动态模块**提供灵活配置
2. **合理使用 @Global()**，避免过度使用
3. **异步初始化**使用 `useFactory`
4. **实现生命周期钩子**进行资源清理
5. **使用接口和抽象类**提高可扩展性
6. **避免在 Provider 中直接访问请求对象**
7. **合理设计依赖层次**，避免过深的依赖链
8. **使用 @Optional()** 处理可选依赖
