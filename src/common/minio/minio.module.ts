import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';

@Global()
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {
  constructor(
    private minioService: MinioService,
    private configService: ConfigService,
  ) {
    // 异步连接 MinIO，避免阻塞应用启动
    this.connectMinio();
  }

  private async connectMinio() {
    try {
      this.minioService.connect({
        endPoint: this.configService.get('MINIO_ENDPOINT') || 'localhost',
        port: parseInt(this.configService.get('MINIO_PORT') || '9000'),
        accessKey: this.configService.get('MINIO_ACCESS_KEY') || 'admin',
        secretKey: this.configService.get('MINIO_SECRET_KEY') || 'admin123456',
        useSSL: false,
      });

      // 确保桶存在
      const bucketName = this.configService.get('MINIO_BUCKET') || 'wertogether';
      await this.minioService.ensureBucket(bucketName);
      Logger.log('MinIO connected successfully', 'MinioModule');
    } catch (error) {
      Logger.warn('MinIO connection failed, continuing without MinIO: ' + error.message, 'MinioModule');
    }
  }
}
