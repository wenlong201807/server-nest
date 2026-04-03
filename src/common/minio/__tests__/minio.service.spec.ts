import { Test, TestingModule } from '@nestjs/testing';
import { MinioService } from '../minio.service';
import * as Minio from 'minio';

jest.mock('minio');

describe('MinioService', () => {
  let service: MinioService;
  let mockClient: jest.Mocked<Minio.Client>;

  beforeEach(async () => {
    mockClient = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      putObject: jest.fn(),
      removeObject: jest.fn(),
      presignedGetObject: jest.fn(),
    } as any;

    (Minio.Client as jest.MockedClass<typeof Minio.Client>).mockImplementation(
      () => mockClient,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [MinioService],
    }).compile();

    service = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('应该初始化 MinIO 客户端', () => {
      const options = {
        endPoint: 'localhost',
        port: 9000,
        accessKey: 'minioadmin',
        secretKey: 'minioadmin',
        useSSL: false,
      };

      service.connect(options);

      expect(Minio.Client).toHaveBeenCalledWith(options);
      expect(service.getClient()).toBe(mockClient);
    });
  });

  describe('ensureBucket', () => {
    beforeEach(() => {
      service.connect({
        endPoint: 'localhost',
        port: 9000,
        accessKey: 'test',
        secretKey: 'test',
        useSSL: false,
      });
    });

    it('应该在桶不存在时创建桶', async () => {
      mockClient.bucketExists.mockResolvedValue(false);
      mockClient.makeBucket.mockResolvedValue(undefined);

      await service.ensureBucket('test-bucket');

      expect(mockClient.bucketExists).toHaveBeenCalledWith('test-bucket');
      expect(mockClient.makeBucket).toHaveBeenCalledWith('test-bucket');
    });

    it('应该在桶已存在时不创建桶', async () => {
      mockClient.bucketExists.mockResolvedValue(true);

      await service.ensureBucket('existing-bucket');

      expect(mockClient.bucketExists).toHaveBeenCalledWith('existing-bucket');
      expect(mockClient.makeBucket).not.toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      service.connect({
        endPoint: 'localhost',
        port: 9000,
        accessKey: 'test',
        secretKey: 'test',
        useSSL: false,
      });
    });

    it('应该上传文件并返回 URL', async () => {
      const buffer = Buffer.from('test content');
      const bucketName = 'test-bucket';
      const objectName = 'test.txt';
      const contentType = 'text/plain';
      const expectedUrl = 'http://localhost:9000/test-bucket/test.txt';

      mockClient.putObject.mockResolvedValue({} as any);
      mockClient.presignedGetObject.mockResolvedValue(expectedUrl);

      const result = await service.uploadFile(
        bucketName,
        objectName,
        buffer,
        contentType,
      );

      expect(mockClient.putObject).toHaveBeenCalledWith(
        bucketName,
        objectName,
        buffer,
        buffer.length,
        { 'Content-Type': contentType },
      );
      expect(result).toBe(expectedUrl);
    });
  });

  describe('deleteFile', () => {
    beforeEach(() => {
      service.connect({
        endPoint: 'localhost',
        port: 9000,
        accessKey: 'test',
        secretKey: 'test',
        useSSL: false,
      });
    });

    it('应该删除文件', async () => {
      const bucketName = 'test-bucket';
      const objectName = 'test.txt';

      mockClient.removeObject.mockResolvedValue(undefined);

      await service.deleteFile(bucketName, objectName);

      expect(mockClient.removeObject).toHaveBeenCalledWith(bucketName, objectName);
    });
  });

  describe('getFileUrl', () => {
    beforeEach(() => {
      service.connect({
        endPoint: 'localhost',
        port: 9000,
        accessKey: 'test',
        secretKey: 'test',
        useSSL: false,
      });
    });

    it('应该生成预签名 URL', async () => {
      const bucketName = 'test-bucket';
      const objectName = 'test.txt';
      const expectedUrl = 'http://localhost:9000/test-bucket/test.txt?signature=xxx';

      mockClient.presignedGetObject.mockResolvedValue(expectedUrl);

      const result = await service.getFileUrl(bucketName, objectName);

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        bucketName,
        objectName,
        24 * 60 * 60,
      );
      expect(result).toBe(expectedUrl);
    });
  });
});
