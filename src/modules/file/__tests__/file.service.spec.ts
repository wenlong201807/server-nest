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
  });

  describe('findAll', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('应该返回所有文件列表', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockFile], 1]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(1, 20);

      expect(result).toEqual({ list: [mockFile], total: 1 });
    });

    it('应该支持按状态过滤', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockFile], 1]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll(1, 20, FileStatus.BLOCKED);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'file.status = :status',
        { status: FileStatus.BLOCKED },
      );
    });

    it('应该支持关键词搜索', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockFile], 1]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll(1, 20, undefined, 'test');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(file.fileName LIKE :keyword OR file.originalName LIKE :keyword OR file.uploadNickname LIKE :keyword)',
        { keyword: '%test%' },
      );
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
  });

  describe('getFileUrl', () => {
    it('应该返回文件 URL', () => {
      const result = service.getFileUrl('uploads/test.jpg');

      expect(result).toBe('http://localhost:9002/test-one/uploads/test.jpg');
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
});
