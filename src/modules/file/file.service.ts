import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { FileRecord, FileStatus } from './entities/file-record.entity';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Injectable()
export class FileService {
  private rustfsDomain: string;
  private rustfsAccessKey: string;
  private rustfsSecretKey: string;
  private rustfsBucket: string;
  private minioClient: Client;

  constructor(
    @InjectRepository(FileRecord)
    private fileRepository: Repository<FileRecord>,
    private configService: ConfigService,
  ) {
    this.rustfsDomain =
      this.configService.get('RUSTFS_DOMAIN') || 'http://localhost:9002';
    this.rustfsAccessKey =
      this.configService.get('RUSTFS_ACCESS_KEY') || 'rustfsadmin';
    this.rustfsSecretKey =
      this.configService.get('RUSTFS_SECRET_KEY') || 'rustfsadmin';
    this.rustfsBucket = this.configService.get('RUSTFS_BUCKET') || 'test-one';
    this.logger.log(
      `RustFS配置: bucket=${this.rustfsBucket}, accessKey=${this.rustfsAccessKey}`,
    );

    this.minioClient = new Client({
      endPoint: 'localhost',
      port: 9002,
      useSSL: false,
      accessKey: 'rustfsadmin',
      secretKey: 'rustfsadmin',
    });
  }

  async create(fileData: Partial<FileRecord>): Promise<FileRecord> {
    const file = this.fileRepository.create(fileData);
    return this.fileRepository.save(file);
  }

  async findById(id: number): Promise<FileRecord> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('文件不存在');
    }
    return file;
  }

  async findByPath(filePath: string): Promise<FileRecord | null> {
    return this.fileRepository.findOne({ where: { filePath } });
  }

  async findByUser(
    userId: number,
    page: number = 1,
    pageSize: number = 20,
    type?: string,
  ): Promise<{ list: FileRecord[]; total: number }> {
    const where: any = { uploadUserId: userId };
    if (type) {
      where.type = type;
    }

    const [list, total] = await this.fileRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total };
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    status?: number,
    keyword?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ list: FileRecord[]; total: number }> {
    const queryBuilder = this.fileRepository.createQueryBuilder('file');

    if (status !== undefined) {
      queryBuilder.andWhere('file.status = :status', { status });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(file.fileName LIKE :keyword OR file.originalName LIKE :keyword OR file.uploadNickname LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (startDate) {
      queryBuilder.andWhere('file.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('file.createdAt <= :endDate', { endDate });
    }

    queryBuilder.orderBy('file.createdAt', 'DESC');

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total };
  }

  async block(id: number, reason?: string): Promise<void> {
    const file = await this.findById(id);
    file.status = FileStatus.BLOCKED;
    await this.fileRepository.save(file);
  }

  async unblock(id: number): Promise<void> {
    const file = await this.findById(id);
    file.status = FileStatus.NORMAL;
    await this.fileRepository.save(file);
  }

  async batchBlock(ids: number[], reason?: string): Promise<number> {
    const result = await this.fileRepository.update(ids, {
      status: FileStatus.BLOCKED,
    });
    return result.affected || 0;
  }

  getFileUrl(filePath: string): string {
    return `${this.rustfsDomain}/${this.rustfsBucket}/${filePath}`;
  }

  async getFileUrlById(id: number): Promise<string | null> {
    const file = await this.findById(id);
    if (file.status === FileStatus.BLOCKED) {
      return null;
    }
    return this.generatePresignedUrl(file.filePath);
  }

  async generatePresignedUrl(filePath: string): Promise<string> {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.rustfsBucket,
        filePath,
        60 * 60 * 24 * 7,
      );
      return url;
    } catch (error) {
      console.error('Failed to generate presigned URL:', error);
      return this.getFileUrl(filePath);
    }
  }

  async generatePresignedPutUrl(filePath: string): Promise<string> {
    try {
      const url = await this.minioClient.presignedPutObject(
        this.rustfsBucket,
        filePath,
        60 * 60 * 24 * 7, // 7 days
      );
      return url;
    } catch (error) {
      console.error('Failed to generate presigned PUT URL:', error);
      throw error;
    }
  }

  async isBlocked(filePath: string): Promise<boolean> {
    const file = await this.findByPath(filePath);
    return file ? file.status === FileStatus.BLOCKED : false;
  }

  async isBlockedById(id: number): Promise<boolean> {
    const file = await this.findById(id);
    return file.status === FileStatus.BLOCKED;
  }

  async softDelete(id: number): Promise<void> {
    const file = await this.findById(id);
    await this.fileRepository.softRemove(file);
  }

  async getConfig() {
    return {
      baseUrl: `${this.rustfsDomain}/${this.rustfsBucket}`,
      bucket: this.rustfsBucket,
      maxSize: 10 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      accessKeyId: this.rustfsAccessKey,
      secretAccessKey: this.rustfsSecretKey,
      endpoint: this.rustfsDomain,
    };
  }
}
