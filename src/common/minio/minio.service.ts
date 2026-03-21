import { Injectable } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private client: Minio.Client;

  constructor() {}

  connect(options: {
    endPoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    useSSL: boolean;
  }) {
    this.client = new Minio.Client(options);
    console.log('MinIO Client initialized');
  }

  async ensureBucket(bucketName: string) {
    const exists = await this.client.bucketExists(bucketName);
    if (!exists) {
      await this.client.makeBucket(bucketName);
      console.log(`Bucket ${bucketName} created`);
    }
  }

  async uploadFile(
    bucketName: string,
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.client.putObject(bucketName, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return this.getFileUrl(bucketName, objectName);
  }

  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    await this.client.removeObject(bucketName, objectName);
  }

  async getFileUrl(bucketName: string, objectName: string): Promise<string> {
    return await this.client.presignedGetObject(bucketName, objectName, 24 * 60 * 60);
  }

  getClient(): Minio.Client {
    return this.client;
  }
}
