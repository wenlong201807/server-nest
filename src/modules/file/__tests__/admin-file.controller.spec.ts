import { Test, TestingModule } from '@nestjs/testing';
import { AdminFileController } from '../admin-file.controller';
import { FileService } from '../file.service';

describe('AdminFileController', () => {
  let controller: AdminFileController;
  let fileService: any;

  beforeEach(async () => {
    fileService = {
      findAll: jest.fn(),
      getFileUrl: jest.fn(),
      block: jest.fn(),
      unblock: jest.fn(),
      batchBlock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminFileController],
      providers: [
        {
          provide: FileService,
          useValue: fileService,
        },
      ],
    }).compile();

    controller = module.get<AdminFileController>(AdminFileController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getList', () => {
    it('应该调用 fileService.findAll', async () => {
      const mockResult = {
        list: [
          {
            id: 1,
            fileName: 'test.jpg',
            filePath: 'uploads/test.jpg',
            originalName: 'test.jpg',
            fileSize: 1024,
            mimeType: 'image/jpeg',
            width: 800,
            height: 600,
            status: 1,
            uploadUserId: 1,
            uploadNickname: 'TestUser',
            createdAt: new Date(),
          },
        ],
        total: 1,
      };
      fileService.findAll.mockResolvedValue(mockResult);
      fileService.getFileUrl.mockReturnValue('https://example.com/test.jpg');

      const result = await controller.getList(1, 20);

      expect(result.total).toBe(1);
      expect(result.list.length).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(fileService.findAll).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined, undefined);
    });

    it('应该支持过滤参数', async () => {
      const mockResult = { list: [], total: 0 };
      fileService.findAll.mockResolvedValue(mockResult);

      await controller.getList(1, 20, 1, 'test', '2024-01-01', '2024-12-31');

      expect(fileService.findAll).toHaveBeenCalledWith(1, 20, 1, 'test', '2024-01-01', '2024-12-31');
    });
  });

  describe('block', () => {
    it('应该调用 fileService.block', async () => {
      fileService.block.mockResolvedValue(undefined);

      const result = await controller.block(1, '违规内容');

      expect(result).toEqual({ message: '拉黑成功' });
      expect(fileService.block).toHaveBeenCalledWith(1, '违规内容');
    });
  });

  describe('unblock', () => {
    it('应该调用 fileService.unblock', async () => {
      fileService.unblock.mockResolvedValue(undefined);

      const result = await controller.unblock(1);

      expect(result).toEqual({ message: '解除拉黑成功' });
      expect(fileService.unblock).toHaveBeenCalledWith(1);
    });
  });

  describe('batchBlock', () => {
    it('应该调用 fileService.batchBlock', async () => {
      const ids = [1, 2, 3];
      fileService.batchBlock.mockResolvedValue(3);

      const result = await controller.batchBlock(ids, '批量违规');

      expect(result).toEqual({ message: '批量拉黑成功', count: 3 });
      expect(fileService.batchBlock).toHaveBeenCalledWith(ids, '批量违规');
    });
  });
});
