import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from '../file.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileRecord, FileStatus } from '../entities/file-record.entity';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { Client } from 'minio';

jest.mock('minio');

describe('FileService', () => {
  let service: FileService;
  let mockRepository: any;
  let mockConfigService: any;
  let mockMinioClient: jest.Mocked<Client>;

  const mockFile: Partial<FileRecord> = {
    id: 1,
    fileName: 'test.jpg',
    originalName: 'original.jpg',
    filePath: 'uploads/test.jpg',
    fileSize: 1024,
    mimeType: 'image/jpeg',
    type: 'image',
    uploadUserId: 1,
    uploadNickname: 'Test User',
    status: FileStatus.NORMAL,
    fileExt: 'jpg',
    bucketName: 'test-one',
    width: 800,
    height: 600,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockFile], 1]),
      })),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          RUSTFS_DOMAIN: 'http://localhost:9002',
          RUSTFS_ACCESS_KEY: 'rustfsadmin',
          RUSTFS_SECRET_KEY: 'rustfsadmin',
          RUSTFS_BUCKET: 'test-one',
        };
        return config[key];
      }),
    };

    mockMinioClient = {
      presignedGetObject: jest.fn(),
      presignedPutObject: jest.fn(),
    } as any;

    (Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockMinioClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: getRepositoryToken(FileRecord),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该创建文件记录', async () => {
      const fileData = {
        fileName: 'test.jpg',
        originalName: 'original.jpg',
        filePath: 'uploads/test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        type: 'image',
        uploadUserId: 1,
      };

      mockRepository.create.mockReturnValue(mockFile);
      mockRepository.save.mockResolvedValue(mockFile);

      const result = await service.create(fileData);

      expect(result).toEqual(mockFile);
      expect(mockRepository.create).toHaveBeenCalledWith(fileData);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('应该返回存在的文件', async () => {
      mockRepository.findOne.mockResolvedValue(mockFile);

      const result = await service.findById(1);

      expect(result).toEqual(mockFile);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('应该抛出异常当文件不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow('文件不存在');
    });
  });

  describe('findByPath', () => {
    it('应该返回存在的文件', async () => {
      mockRepository.findOne.mockResolvedValue(mockFile);

      const result = await service.findByPath('uploads/test.jpg');

      expect(result).toEqual(mockFile);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { filePath: 'uploads/test.jpg' },
      });
    });

    it('应该返回 null 当文件不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByPath('nonexistent.jpg');

      expect(result).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('应该返回用户的文件列表', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockFile], 1]);

      const result = await service.findByUser(1, 1, 20);

      expect(result).toEqual({ list: [mockFile], total: 1 });
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { uploadUserId: 1 },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该支持按类型过滤', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockFile], 1]);

      await service.findByUser(1, 1, 20, 'image');

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { uploadUserId: 1, type: 'image' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该使用默认分页参数', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockFile], 1]);

      await service.findByUser(1);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { uploadUserId: 1 },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该正确计算分页偏移量', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockFile], 1]);

      await service.findByUser(1, 3, 10);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { uploadUserId: 1 },
        order: { createdAt: 'DESC' },
        skip: 20,
        take: 10,
      });
    });
  });

  describe('findAll', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockFile], 1]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('应该返回所有文件列表', async () => {
      const result = await service.findAll(1, 20);

      expect(result).toEqual({ list: [mockFile], total: 1 });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('file.createdAt', 'DESC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('应该使用默认分页参数', async () => {
      await service.findAll();

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('应该支持按状态过滤', async () => {
      await service.findAll(1, 20, FileStatus.BLOCKED);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'file.status = :status',
        { status: FileStatus.BLOCKED },
      );
    });

    it('应该支持状态为 0 的过滤', async () => {
      await service.findAll(1, 20, 0);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'file.status = :status',
        { status: 0 },
      );
    });

    it('应该支持关键词搜索', async () => {
      await service.findAll(1, 20, undefined, 'test');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(file.fileName LIKE :keyword OR file.originalName LIKE :keyword OR file.uploadNickname LIKE :keyword)',
        { keyword: '%test%' },
      );
    });

    it('应该支持开始日期过滤', async () => {
      await service.findAll(1, 20, undefined, undefined, '2024-01-01');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'file.createdAt >= :startDate',
        { startDate: '2024-01-01' },
      );
    });

    it('应该支持结束日期过滤', async () => {
      await service.findAll(1, 20, undefined, undefined, undefined, '2024-12-31');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'file.createdAt <= :endDate',
        { endDate: '2024-12-31' },
      );
    });

    it('应该支持所有过滤条件组合', async () => {
      await service.findAll(1, 20, FileStatus.NORMAL, 'test', '2024-01-01', '2024-12-31');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'file.status = :status',
        { status: FileStatus.NORMAL },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(file.fileName LIKE :keyword OR file.originalName LIKE :keyword OR file.uploadNickname LIKE :keyword)',
        { keyword: '%test%' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'file.createdAt >= :startDate',
        { startDate: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'file.createdAt <= :endDate',
        { endDate: '2024-12-31' },
      );
    });

    it('应该正确计算分页偏移量', async () => {
      await service.findAll(3, 10);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('block', () => {
    it('应该封禁文件', async () => {
      mockRepository.findOne.mockResolvedValue(mockFile);
      mockRepository.save.mockResolvedValue({ ...mockFile, status: FileStatus.BLOCKED });

      await service.block(1);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: FileStatus.BLOCKED }),
      );
    });

    it('应该封禁文件并传入原因参数', async () => {
      mockRepository.findOne.mockResolvedValue(mockFile);
      mockRepository.save.mockResolvedValue({ ...mockFile, status: FileStatus.BLOCKED });

      await service.block(1, 'violation');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: FileStatus.BLOCKED }),
      );
    });

    it('应该在文件不存在时抛出异常', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.block(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('unblock', () => {
    it('应该解封文件', async () => {
      const blockedFile = { ...mockFile, status: FileStatus.BLOCKED };
      mockRepository.findOne.mockResolvedValue(blockedFile);
      mockRepository.save.mockResolvedValue({ ...blockedFile, status: FileStatus.NORMAL });

      await service.unblock(1);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: FileStatus.NORMAL }),
      );
    });

    it('应该在文件不存在时抛出异常', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.unblock(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchBlock', () => {
    it('应该批量封禁文件', async () => {
      mockRepository.update.mockResolvedValue({ affected: 3 });

      const result = await service.batchBlock([1, 2, 3]);

      expect(result).toBe(3);
      expect(mockRepository.update).toHaveBeenCalledWith([1, 2, 3], {
        status: FileStatus.BLOCKED,
      });
    });

    it('应该批量封禁文件并传入原因参数', async () => {
      mockRepository.update.mockResolvedValue({ affected: 2 });

      const result = await service.batchBlock([1, 2], 'violation');

      expect(result).toBe(2);
      expect(mockRepository.update).toHaveBeenCalledWith([1, 2], {
        status: FileStatus.BLOCKED,
      });
    });

    it('应该在没有受影响的行时返回 0', async () => {
      mockRepository.update.mockResolvedValue({ affected: undefined });

      const result = await service.batchBlock([999]);

      expect(result).toBe(0);
    });
  });

  describe('getFileUrl', () => {
    it('应该返回文件 URL', () => {
      const result = service.getFileUrl('uploads/test.jpg');

      expect(result).toBe('http://localhost:9002/test-one/uploads/test.jpg');
    });

    it('应该处理不同的文件路径', () => {
      const result = service.getFileUrl('images/avatar.png');

      expect(result).toBe('http://localhost:9002/test-one/images/avatar.png');
    });
  });

  describe('getFileUrlById', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('应该返回文件的预签名 URL', async () => {
      const normalFile = { ...mockFile, status: FileStatus.NORMAL };
      mockRepository.findOne.mockResolvedValueOnce(normalFile);
      mockMinioClient.presignedGetObject.mockResolvedValue('http://presigned-url');

      const result = await service.getFileUrlById(1);

      expect(result).toBe('http://presigned-url');
    });

    it('应该返回 null 当文件被封禁', async () => {
      const blockedFile = { ...mockFile, status: FileStatus.BLOCKED };
      mockRepository.findOne.mockResolvedValueOnce(blockedFile);

      const result = await service.getFileUrlById(1);

      expect(result).toBeNull();
    });

    it('应该在文件不存在时抛出异常', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getFileUrlById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('generatePresignedUrl', () => {
    it('应该生成预签名 URL', async () => {
      mockMinioClient.presignedGetObject.mockResolvedValue('http://presigned-url');

      const result = await service.generatePresignedUrl('uploads/test.jpg');

      expect(result).toBe('http://presigned-url');
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'test-one',
        'uploads/test.jpg',
        60 * 60 * 24 * 7,
      );
    });

    it('应该在失败时返回普通 URL', async () => {
      mockMinioClient.presignedGetObject.mockRejectedValue(new Error('Failed'));

      const result = await service.generatePresignedUrl('uploads/test.jpg');

      expect(result).toBe('http://localhost:9002/test-one/uploads/test.jpg');
    });
  });

  describe('generatePresignedPutUrl', () => {
    it('应该生成上传预签名 URL', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue('http://presigned-put-url');

      const result = await service.generatePresignedPutUrl('uploads/test.jpg');

      expect(result).toBe('http://presigned-put-url');
      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(
        'test-one',
        'uploads/test.jpg',
        60 * 60 * 24 * 7,
      );
    });

    it('应该在失败时抛出异常', async () => {
      mockMinioClient.presignedPutObject.mockRejectedValue(new Error('Failed'));

      await expect(service.generatePresignedPutUrl('uploads/test.jpg')).rejects.toThrow(
        'Failed',
      );
    });
  });

  describe('isBlocked', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('应该返回 true 当文件被封禁', async () => {
      const blockedFile = { ...mockFile, status: FileStatus.BLOCKED };
      mockRepository.findOne.mockResolvedValueOnce(blockedFile);

      const result = await service.isBlocked('uploads/test.jpg');

      expect(result).toBe(true);
    });

    it('应该返回 false 当文件未被封禁', async () => {
      const normalFile = { ...mockFile, status: FileStatus.NORMAL };
      mockRepository.findOne.mockResolvedValueOnce(normalFile);

      const result = await service.isBlocked('uploads/test.jpg');

      expect(result).toBe(false);
    });

    it('应该返回 false 当文件不存在', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.isBlocked('nonexistent.jpg');

      expect(result).toBe(false);
    });
  });

  describe('isBlockedById', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('应该返回 true 当文件被封禁', async () => {
      const blockedFile = { ...mockFile, status: FileStatus.BLOCKED };
      mockRepository.findOne.mockResolvedValueOnce(blockedFile);

      const result = await service.isBlockedById(1);

      expect(result).toBe(true);
    });

    it('应该返回 false 当文件未被封禁', async () => {
      const normalFile = { ...mockFile, status: FileStatus.NORMAL };
      mockRepository.findOne.mockResolvedValueOnce(normalFile);

      const result = await service.isBlockedById(1);

      expect(result).toBe(false);
    });
  });

  describe('softDelete', () => {
    it('应该软删除文件', async () => {
      mockRepository.findOne.mockResolvedValue(mockFile);
      mockRepository.softRemove.mockResolvedValue(mockFile);

      await service.softDelete(1);

      expect(mockRepository.softRemove).toHaveBeenCalledWith(mockFile);
    });

    it('应该在文件不存在时抛出异常', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.softDelete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConfig', () => {
    it('应该返回配置信息', async () => {
      const result = await service.getConfig();

      expect(result).toEqual({
        baseUrl: 'http://localhost:9002/test-one',
        bucket: 'test-one',
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        accessKeyId: 'rustfsadmin',
        secretAccessKey: 'rustfsadmin',
        endpoint: 'http://localhost:9002',
      });
    });
  });

  describe('constructor fallback values', () => {
    it('应该使用默认值当 RUSTFS_DOMAIN 未配置', async () => {
      const mockConfigWithMissingDomain = {
        get: jest.fn((key: string) => {
          if (key === 'RUSTFS_DOMAIN') return undefined;
          if (key === 'RUSTFS_ACCESS_KEY') return 'rustfsadmin';
          if (key === 'RUSTFS_SECRET_KEY') return 'rustfsadmin';
          if (key === 'RUSTFS_BUCKET') return 'test-one';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          FileService,
          {
            provide: getRepositoryToken(FileRecord),
            useValue: mockRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithMissingDomain,
          },
        ],
      }).compile();

      const serviceWithDefaults = module.get<FileService>(FileService);
      const config = await serviceWithDefaults.getConfig();

      expect(config.endpoint).toBe('http://localhost:9002');
    });

    it('应该使用默认值当 RUSTFS_ACCESS_KEY 未配置', async () => {
      const mockConfigWithMissingAccessKey = {
        get: jest.fn((key: string) => {
          if (key === 'RUSTFS_DOMAIN') return 'http://localhost:9002';
          if (key === 'RUSTFS_ACCESS_KEY') return null;
          if (key === 'RUSTFS_SECRET_KEY') return 'rustfsadmin';
          if (key === 'RUSTFS_BUCKET') return 'test-one';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          FileService,
          {
            provide: getRepositoryToken(FileRecord),
            useValue: mockRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithMissingAccessKey,
          },
        ],
      }).compile();

      const serviceWithDefaults = module.get<FileService>(FileService);
      const config = await serviceWithDefaults.getConfig();

      expect(config.accessKeyId).toBe('rustfsadmin');
    });

    it('应该使用默认值当 RUSTFS_SECRET_KEY 未配置', async () => {
      const mockConfigWithMissingSecretKey = {
        get: jest.fn((key: string) => {
          if (key === 'RUSTFS_DOMAIN') return 'http://localhost:9002';
          if (key === 'RUSTFS_ACCESS_KEY') return 'rustfsadmin';
          if (key === 'RUSTFS_SECRET_KEY') return '';
          if (key === 'RUSTFS_BUCKET') return 'test-one';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          FileService,
          {
            provide: getRepositoryToken(FileRecord),
            useValue: mockRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithMissingSecretKey,
          },
        ],
      }).compile();

      const serviceWithDefaults = module.get<FileService>(FileService);
      const config = await serviceWithDefaults.getConfig();

      expect(config.secretAccessKey).toBe('rustfsadmin');
    });

    it('应该使用默认值当 RUSTFS_BUCKET 未配置', async () => {
      const mockConfigWithMissingBucket = {
        get: jest.fn((key: string) => {
          if (key === 'RUSTFS_DOMAIN') return 'http://localhost:9002';
          if (key === 'RUSTFS_ACCESS_KEY') return 'rustfsadmin';
          if (key === 'RUSTFS_SECRET_KEY') return 'rustfsadmin';
          if (key === 'RUSTFS_BUCKET') return undefined;
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          FileService,
          {
            provide: getRepositoryToken(FileRecord),
            useValue: mockRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithMissingBucket,
          },
        ],
      }).compile();

      const serviceWithDefaults = module.get<FileService>(FileService);
      const config = await serviceWithDefaults.getConfig();

      expect(config.bucket).toBe('test-one');
    });

    it('应该使用所有默认值当所有配置都未设置', async () => {
      const mockConfigWithAllMissing = {
        get: jest.fn(() => null),
      };

      const module = await Test.createTestingModule({
        providers: [
          FileService,
          {
            provide: getRepositoryToken(FileRecord),
            useValue: mockRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithAllMissing,
          },
        ],
      }).compile();

      const serviceWithDefaults = module.get<FileService>(FileService);
      const config = await serviceWithDefaults.getConfig();

      expect(config.endpoint).toBe('http://localhost:9002');
      expect(config.accessKeyId).toBe('rustfsadmin');
      expect(config.secretAccessKey).toBe('rustfsadmin');
      expect(config.bucket).toBe('test-one');
    });
  });

  describe('getFileUrl edge cases', () => {
    it('应该处理空路径', () => {
      const result = service.getFileUrl('');
      expect(result).toBe('http://localhost:9002/test-one/');
    });

    it('应该处理带特殊字符的路径', () => {
      const result = service.getFileUrl('uploads/file with spaces.jpg');
      expect(result).toBe('http://localhost:9002/test-one/uploads/file with spaces.jpg');
    });

    it('应该处理深层嵌套路径', () => {
      const result = service.getFileUrl('a/b/c/d/e/file.jpg');
      expect(result).toBe('http://localhost:9002/test-one/a/b/c/d/e/file.jpg');
    });
  });

  describe('findByUser edge cases', () => {
    it('应该处理空结果', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findByUser(999);

      expect(result).toEqual({ list: [], total: 0 });
    });

    it('应该处理 page 为 0 的情况', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockFile], 1]);

      await service.findByUser(1, 0, 20);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { uploadUserId: 1 },
        order: { createdAt: 'DESC' },
        skip: -20,
        take: 20,
      });
    });

    it('应该处理负数 page 的情况', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockFile], 1]);

      await service.findByUser(1, -1, 20);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { uploadUserId: 1 },
        order: { createdAt: 'DESC' },
        skip: -40,
        take: 20,
      });
    });

    it('应该处理空字符串类型过滤', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockFile], 1]);

      await service.findByUser(1, 1, 20, '');

      // Empty string is truthy in the if condition, so type filter is not added
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { uploadUserId: 1 },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('findAll edge cases', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockFile], 1]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('应该处理空结果', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll();

      expect(result).toEqual({ list: [], total: 0 });
    });

    it('应该处理空字符串关键词', async () => {
      await service.findAll(1, 20, undefined, '');

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('应该处理空字符串日期', async () => {
      await service.findAll(1, 20, undefined, undefined, '', '');

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('应该处理 null 状态', async () => {
      await service.findAll(1, 20, null as any);

      // null is not undefined, so the filter is applied
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'file.status = :status',
        { status: null },
      );
    });
  });
});
