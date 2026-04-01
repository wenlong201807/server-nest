import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // 全局前缀
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS配置
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    // 本地开发环境
    'http://localhost:3000',      // H5 本地开发
    'http://localhost:3001',      // Admin 本地开发
    'http://localhost:9201',      // Swagger UI
    'http://127.0.0.1:9201',

    // Dev 环境
    'http://localhost:8118',      // 后端 Dev
    'http://localhost:5173',      // H5 Dev
    'http://localhost:5174',      // Admin Dev

    // Staging 环境
    'http://localhost:8119',      // 后端 Staging
    'http://localhost:5175',      // H5 Staging
    'http://localhost:5176',      // Admin Staging

    // Production 环境
    'http://localhost:8120',      // 后端 Production
    'http://localhost:5177',      // H5 Production
    'http://localhost:5178',      // Admin Production
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // 允许没有 origin 的请求（如 Postman、curl、服务端请求）
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // 开发环境允许所有 localhost
        if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600, // 预检请求缓存时间（秒）
  });

  // Swagger文档
  const config = new DocumentBuilder()
    .setTitle('WeTogether API')
    .setDescription('相亲网站API接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', '认证模块')
    .addTag('user', '用户模块')
    .addTag('points', '积分模块')
    .addTag('square', '广场模块')
    .addTag('friend', '好友模块')
    .addTag('chat', '聊天模块')
    .addTag('certification', '认证模块')
    .addTag('admin', '管理后台')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
