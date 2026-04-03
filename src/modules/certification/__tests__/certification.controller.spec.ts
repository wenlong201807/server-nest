import { Test, TestingModule } from '@nestjs/testing';
import { CertificationController } from '../certification.controller';
import { CertificationService } from '../certification.service';
import { CertificationType } from '@common/constants';

describe('CertificationController', () => {
  let controller: CertificationController;
  let certificationService: any;

  beforeEach(async () => {
    certificationService = {
      create: jest.fn(),
      getList: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificationController],
      providers: [
        {
          provide: CertificationService,
          useValue: certificationService,
        },
      ],
    }).compile();

    controller = module.get<CertificationController>(CertificationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该调用 certificationService.create', async () => {
      const userId = 1;
      const dto = {
        type: CertificationType.ID_CARD,
        imageUrl: 'https://example.com/id-card.jpg',
        description: '身份证认证',
      };
      const mockResult = {
        id: 1,
        userId,
        type: dto.type,
        status: 0,
      };
      certificationService.create.mockResolvedValue(mockResult);

      const result = await controller.create(userId, dto);

      expect(result).toEqual(mockResult);
      expect(certificationService.create).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('getList', () => {
    it('应该调用 certificationService.getList', async () => {
      const userId = 1;
      const mockResult = [
        {
          id: 1,
          userId,
          typeCode: 'student',
          status: 1,
          createdAt: new Date(),
        },
      ];
      certificationService.getList.mockResolvedValue(mockResult);

      const result = await controller.getList(userId);

      expect(result).toEqual(mockResult);
      expect(certificationService.getList).toHaveBeenCalledWith(userId, undefined);
    });

    it('应该支持状态过滤', async () => {
      const userId = 1;
      const status = 1;
      certificationService.getList.mockResolvedValue([]);

      await controller.getList(userId, status);

      expect(certificationService.getList).toHaveBeenCalledWith(userId, status);
    });
  });
});
