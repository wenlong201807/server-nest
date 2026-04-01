# NestJS 依赖注入机制

## 什么是依赖注入（DI）

依赖注入是一种设计模式，用于实现控制反转（IoC）。它允许类从外部获取依赖，而不是自己创建依赖。

### 传统方式 vs 依赖注入

**传统方式（紧耦合）：**

```typescript
class UserService {
  private database: Database;

  constructor() {
    // 直接创建依赖，紧耦合
    this.database = new Database('localhost', 3306);
  }
}
```

**依赖注入方式（松耦合）：**

```typescript
@Injectable()
class UserService {
  constructor(
    // 依赖由外部注入
    private database: Database,
  ) {}
}
```

## NestJS 中的依赖注入

### 1. 构造函数注入（推荐）

最常用的注入方式，通过构造函数参数注入依赖。

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    private userService: UserService,
    private pointsService: PointsService,
  ) {}

  async getFriendList(userId: number) {
    // 使用注入的依赖
    const list = await this.friendshipRepository.find({
      where: { userId, status: FriendStatus.FRIEND },
    });
    return list;
  }
}
```

### 2. 属性注入（不推荐）

通过 `@Inject()` 装饰器注入到属性。

```typescript
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class UserService {
  @Inject(DatabaseService)
  private database: DatabaseService;
}
```

## 注入令牌（Injection Token）

### 1. 类令牌（Class Token）

最常见的方式，直接使用类作为令牌。

```typescript
@Injectable()
export class UserService {
  constructor(
    private databaseService: DatabaseService, // 类令牌
  ) {}
}
```

### 2. 字符串令牌（String Token）

使用字符串作为令牌，适用于非类依赖。

```typescript
// 注册
@Module({
  providers: [
    {
      provide: 'API_KEY',
      useValue: 'my-secret-key',
    },
  ],
})
export class AppModule {}

// 注入
@Injectable()
export class ApiService {
  constructor(
    @Inject('API_KEY') private apiKey: string,
  ) {}
}
```

### 3. Symbol 令牌

使用 Symbol 避免命名冲突。

```typescript
export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: () => createConnection(),
    },
  ],
})
export class DatabaseModule {}
```

## Provider 注册方式

### 1. 标准注册（useClass）

```typescript
@Module({
  providers: [UserService], // 简写
  // 等同于
  providers: [
    {
      provide: UserService,
      useClass: UserService,
    },
  ],
})
export class UserModule {}
```

### 2. 值注册（useValue）

注入常量或配置对象。

```typescript
@Module({
  providers: [
    {
      provide: 'CONFIG',
      useValue: {
        apiUrl: 'https://api.example.com',
        timeout: 5000,
      },
    },
  ],
})
export class AppModule {}
```

### 3. 工厂注册（useFactory）

动态创建 Provider，支持异步。

```typescript
@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const connection = await createConnection({
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
        });
        return connection;
      },
      inject: [ConfigService], // 工厂函数的依赖
    },
  ],
})
export class DatabaseModule {}
```

### 4. 别名注册（useExisting）

为现有 Provider 创建别名。

```typescript
@Module({
  providers: [
    UserService,
    {
      provide: 'USER_SERVICE_ALIAS',
      useExisting: UserService,
    },
  ],
})
export class UserModule {}
```

## 实际项目案例：FriendService

从项目中看完整的依赖注入流程：

### 1. 定义 Service

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FriendService {
  constructor(
    // 注入 TypeORM Repository
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(UserBlacklist)
    private blacklistRepository: Repository<UserBlacklist>,
    // 注入其他 Service
    private userService: UserService,
    private pointsService: PointsService,
  ) {}

  async follow(userId: number, targetId: number) {
    if (userId === targetId) {
      throw new BadRequestException('不能添加自己');
    }

    const existing = await this.friendshipRepository.findOne({
      where: { userId, friendId: targetId },
    });

    if (existing) {
      throw new BadRequestException('关系已存在');
    }

    const friendship = this.friendshipRepository.create({
      userId,
      friendId: targetId,
      status: FriendStatus.FOLLOWING,
    });

    return this.friendshipRepository.save(friendship);
  }

  async unlockChat(userId: number, targetId: number) {
    // 使用注入的 userService
    const user = await this.userService.findById(userId);
    const requiredPoints = 50;
    
    if (user.points < requiredPoints) {
      throw new BadRequestException('积分不足');
    }

    // 使用注入的 pointsService
    await this.pointsService.addPoints(
      userId, 
      -requiredPoints, 
      PointsSourceType.UNLOCK_CHAT, 
      targetId, 
      '解锁私聊'
    );

    // 更新关系
    const friendship = await this.friendshipRepository.findOne({
      where: { userId, friendId: targetId },
    });
    
    friendship.status = FriendStatus.FRIEND;
    await this.friendshipRepository.save(friendship);

    return { unlocked: true, pointsConsumed: requiredPoints };
  }
}
```

### 2. 在 Module 中注册

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';
import { Friendship } from './entities/friendship.entity';
import { UserBlacklist } from './entities/blacklist.entity';
import { UserModule } from '../user/user.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    // 导入 TypeORM 实体，自动注册 Repository
    TypeOrmModule.forFeature([Friendship, UserBlacklist]),
    // 导入其他模块，获取它们导出的 Provider
    UserModule,
    PointsModule,
  ],
  controllers: [FriendController],
  providers: [FriendService], // 注册 FriendService
  exports: [FriendService],   // 导出供其他模块使用
})
export class FriendModule {}
```

### 3. 在 Controller 中使用

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { FriendService } from './friend.service';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('friend')
export class FriendController {
  constructor(
    // 注入 FriendService
    private friendService: FriendService,
  ) {}

  @Post('follow')
  async follow(
    @CurrentUser('sub') userId: number, 
    @Body('userId') targetId: number
  ) {
    // 使用注入的 service
    return this.friendService.follow(userId, targetId);
  }

  @Post('unlock-chat')
  async unlockChat(
    @CurrentUser('sub') userId: number, 
    @Body('userId') targetId: number
  ) {
    return this.friendService.unlockChat(userId, targetId);
  }
}
```

## 依赖注入的优势

### 1. 松耦合

类不需要知道依赖的具体实现，只需要知道接口。

```typescript
// 可以轻松替换实现
@Module({
  providers: [
    {
      provide: 'CacheService',
      useClass: RedisCacheService, // 可以换成 MemoryCacheService
    },
  ],
})
```

### 2. 可测试性

可以轻松注入 Mock 对象进行单元测试。

```typescript
describe('FriendService', () => {
  let service: FriendService;
  let mockRepository: jest.Mocked<Repository<Friendship>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FriendService,
        {
          provide: getRepositoryToken(Friendship),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FriendService>(FriendService);
    mockRepository = module.get(getRepositoryToken(Friendship));
  });

  it('should follow user', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    // 测试逻辑
  });
});
```

### 3. 可维护性

依赖关系清晰，易于理解和维护。

### 4. 可重用性

Provider 可以在多个模块中共享使用。

## 常见陷阱

### 1. 循环依赖

```typescript
// ❌ 错误：循环依赖
// user.service.ts
@Injectable()
export class UserService {
  constructor(private friendService: FriendService) {}
}

// friend.service.ts
@Injectable()
export class FriendService {
  constructor(private userService: UserService) {}
}

// ✅ 解决方案：使用 forwardRef
@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => FriendService))
    private friendService: FriendService,
  ) {}
}
```

### 2. 忘记注册 Provider

```typescript
// ❌ 错误：使用了未注册的 Provider
@Module({
  providers: [], // 忘记注册 UserService
  controllers: [UserController],
})

// ✅ 正确
@Module({
  providers: [UserService],
  controllers: [UserController],
})
```

### 3. 作用域不匹配

```typescript
// ❌ 错误：DEFAULT 作用域的 Provider 不能注入 REQUEST 作用域的 Provider
@Injectable()
export class AppService {
  constructor(
    @Injectable({ scope: Scope.REQUEST })
    private requestService: RequestService,
  ) {}
}
```

## 最佳实践

1. **优先使用构造函数注入**
2. **避免循环依赖**，合理设计模块结构
3. **使用接口定义依赖**，提高可替换性
4. **合理使用作用域**，默认使用单例模式
5. **Provider 命名清晰**，遵循命名规范
6. **导出必要的 Provider**，供其他模块使用
