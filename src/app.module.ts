import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProfileModule } from './modules/profile/profile.module';
import { PointsModule } from './modules/points/points.module';
import { SquareModule } from './modules/square/square.module';
import { FriendModule } from './modules/friend/friend.module';
import { ChatModule } from './modules/chat/chat.module';
import { CertificationModule } from './modules/certification/certification.module';
import { AdminModule } from './modules/admin/admin.module';
import { PointsConfigModule } from './modules/points-config/points-config.module';
import { CertificationTypeModule } from './modules/certification-type/certification-type.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { TestDataModule } from './modules/test-data/test-data.module';
import { CommonModule } from './common/common.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

// Filters & Interceptors & Guards
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

// Entities
import { User } from './modules/user/entities/user.entity';
import { UserProfile } from './modules/profile/entities/profile.entity';
import { Certification } from './modules/certification/entities/certification.entity';
import { PointsLog } from './modules/points/entities/points-log.entity';
import { SquarePost } from './modules/square/entities/post.entity';
import { SquareComment } from './modules/square/entities/comment.entity';
import { SquareLike } from './modules/square/entities/like.entity';
import { PostReport } from './modules/square/entities/report.entity';
import { Friendship } from './modules/friend/entities/friendship.entity';
import { UserBlacklist } from './modules/friend/entities/blacklist.entity';
import { ChatMessage } from './modules/chat/entities/message.entity';
import { SignRecord } from './modules/sign-record/sign-record.entity';
import { SystemConfig } from './modules/system-config/system-config.entity';
import { UserViolation } from './modules/user-violation/user-violation.entity';
import { PointsConfig } from './modules/points-config/entities/points-config.entity';
import { CertificationType } from './modules/certification-type/entities/certification-type.entity';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),

    // TypeORM数据库
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
          PointsLog,
          SquarePost,
          SquareComment,
          SquareLike,
          PostReport,
          Friendship,
          UserBlacklist,
          ChatMessage,
          SignRecord,
          SystemConfig,
          UserViolation,
          PointsConfig,
          CertificationType,
        ],
        synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
        logging: configService.get('NODE_ENV') === 'development',
        timezone: '+08:00',
        charset: 'utf8mb4',
      }),
      inject: [ConfigService],
    }),

    // 限流模块
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60秒
        limit: 100, // 最多100个请求
      },
    ]),

    // 静态文件服务
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // 业务模块
    CommonModule,
    AuthModule,
    UserModule,
    ProfileModule,
    PointsModule,
    SquareModule,
    FriendModule,
    ChatModule,
    CertificationModule,
    AdminModule,
    PointsConfigModule,
    CertificationTypeModule,
    SystemConfigModule,
    TestDataModule,
    WebSocketModule,
  ],
  controllers: [],
  providers: [
    // 全局异常过滤器
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // 全局响应拦截器
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // 全局JWT守卫
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
