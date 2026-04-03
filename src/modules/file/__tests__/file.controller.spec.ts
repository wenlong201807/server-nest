import { Test, TestingModule } from '@nestjs/testing';
import { FileController } from '../file.controller';
import { FileService } from '../file.service';

describe('FileController', () => {
  let controller: FileController;
  let fileService: any;

  beforeEach(async () => {
    fileService = {
      getConfig: jest.fn(),
      generatePresignedPutUrl: jest.fn(),
      create: jest.fn(),
      generatePresignedUrl: jest.fn(),
      findById: jest.fn(),
      getFileUrl: jest.fn(),
      isBlockedById: jest.fn(),
      getFileUrlById: jest.fn(),
      findByUser: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [
        {
          provide: FileService,
          useValue: fileService,
        },
      ],
    }).compile();

    controller = module.get<FileController>(FileController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('应该调用 fileService.getConfig', async () => {
      const mockConfig = { maxSize: 10485760, allowedTypes: ['image/jpeg'] };
      fileService.getConfig.mockResolvedValue(mockConfig);

      const result = await controller.getConfig();

      expect(result).toEqual(mockConfig);
      expect(fileService.getConfig).toHaveBeenCalled();
    });
  });

  describe('getPresignedPutUrl', () => {
    it('应该调用 fileService.generatePresignedPutUrl', async () => {
      const body = { filePath: 'uploads/test.jpg' };
      const mockUrl = 'https://s3.example.com/presigned-url';
      fileService.generatePresignedPutUrl.mockResolvedValue(mockUrl);

      const result = await controller.getPresignedPutUrl(body);

      expect(result).toEqual({
        uploadUrl: mockUrl,
        filePath: body.filePath,
        expiresIn: 3600,
      });
      expect(fileService.generatePresignedPutUrl).toHaveBeenCalledWith(body.filePath);
    });
  });

  describe('upload', () => {
    it('应该调用 fileService.create 和 generatePresignedUrl', async () => {
      const body = {
        filePath: 'uploads/test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        width: 800,
        height: 600,
      };
      const user = { id: 1, sub: 1, mobile: '13800138000', nickname: 'TestUser' };
      const mockFile = { id: 1, fileName: 'test.jpg', filePath: 'uploads/test.jpg', fileExt: 'jpg' };
      const mockUrl = 'https://s3.example.com/test.jpg';

      fileService.create.mockResolvedValue(mockFile);
      fileService.generatePresignedUrl.mockResolvedValue(mockUrl);

      const result = await controller.upload(body, user);

      expect(result.id).toBe(1);
      expect(result.url).toBe(mockUrl);
      expect(fileService.create).toHaveBeenCalled();
      expect(fileService.generatePresignedUrl).toHaveBeenCalledWith(mockFile.filePath);
    });
  });

  describe('getById', () => {
    it('应该调用 fileService.findById', async () => {
      const mockFile = {
        id: 1,
        fileName: 'test.jpg',
        filePath: 'uploads/test.jpg',
        status: 1,
        createdAt: new Date(),
      };
      fileService.findById.mockResolvedValue(mockFile);
      fileService.getFileUrl.mockReturnValue('https://example.com/test.jpg');

      const result = await controller.getById(1);

      expect(result.id).toBe(1);
      expect(fileService.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('getUrl', () => {
    it('应该返回文件URL当文件未被拉黑', async () => {
      const mockUrl = 'https://example.com/test.jpg';
      fileService.isBlockedById.mockResolvedValue(false);
      fileService.getFileUrlById.mockResolvedValue(mockUrl);

      const result = await controller.getUrl(1);

      expect(result).toEqual({
        url: mockUrl,
        blocked: false,
        expiresIn: 86400,
      });
      expect(fileService.isBlockedById).toHaveBeenCalledWith(1);
      expect(fileService.getFileUrlById).toHaveBeenCalledWith(1);
    });

    it('应该返回null当文件被拉黑', async () => {
      fileService.isBlockedById.mockResolvedValue(true);

      const result = await controller.getUrl(1);

      expect(result).toEqual({
        url: null,
        blocked: true,
        expiresIn: 0,
      });
      expect(fileService.isBlockedById).toHaveBeenCalledWith(1);
      expect(fileService.getFileUrlById).not.toHaveBeenCalled();
    });
  });

  describe('getMyFiles', () => {
    it('应该调用 fileService.findByUser', async () => {
      const user = { id: 1, sub: 1, mobile: '13800138000', nickname: 'TestUser' };
      const mockResult = {
        list: [
          {
            id: 1,
            fileName: 'test.jpg',
            filePath: 'uploads/test.jpg',
            originalName: 'test.jpg',
            fileSize: 1024,
            status: 1,
            createdAt: new Date(),
          },
        ],
        total: 1,
      };
      fileService.findByUser.mockResolvedValue(mockResult);
      fileService.getFileUrl.mockReturnValue('https://example.com/test.jpg');

      const result = await controller.getMyFiles(1, 20, undefined, user);

      expect(result.total).toBe(1);
      expect(result.list.length).toBe(1);
      expect(fileService.findByUser).toHaveBeenCalledWith(1, 1, 20, undefined);
    });
  });

  describe('delete', () => {
    it('应该调用 fileService.softDelete', async () => {
      fileService.softDelete.mockResolvedValue(undefined);

      const result = await controller.delete(1);

      expect(result).toEqual({ message: '删除成功' });
      expect(fileService.softDelete).toHaveBeenCalledWith(1);
    });
  });
});
