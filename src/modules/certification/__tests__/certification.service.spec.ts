import { Test, TestingModule } from '@nestjs/testing';
import { CertificationService } from '../certification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Certification } from '../entities/certification.entity';
import { NotFoundException } from '@nestjs/common';
import { CertificationStatus, CertificationType } from '@common/constants';

describe('CertificationService', () => {
  let service: CertificationService;
  let mockRepository: any;

  const mockCertification = {
    id: 1,
    userId: 1,
    type: CertificationType.HOUSE,
    imageUrl: 'http://example.com/cert.jpg',
    description: 'Test certification',
    status: CertificationStatus.PENDING,
    rejectReason: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificationService,
        {
          provide: getRepositoryToken(Certification),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CertificationService>(CertificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该创建认证申请', async () => {
      const dto = {
        type: CertificationType.HOUSE,
        imageUrl: 'http://example.com/cert.jpg',
        description: 'Test certification',
      };

      mockRepository.create.mockReturnValue(mockCertification);
      mockRepository.save.mockResolvedValue(mockCertification);

      const result = await service.create(1, dto);

      expect(result).toEqual(mockCertification);
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: 1,
        type: CertificationType.HOUSE,
        imageUrl: 'http://example.com/cert.jpg',
        description: 'Test certification',
        status: CertificationStatus.PENDING,
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('getList', () => {
    it('应该返回用户的认证列表', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCertification]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getList(1);

      expect(result).toEqual([mockCertification]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('cert.userId = :userId', { userId: 1 });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('cert.createdAt', 'DESC');
    });

    it('应该支持按状态过滤', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCertification]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getList(1, CertificationStatus.APPROVED);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cert.status = :status', {
        status: CertificationStatus.APPROVED,
      });
    });
  });

  describe('approve', () => {
    it('应该批准认证', async () => {
      mockRepository.findOne.mockResolvedValue(mockCertification);
      mockRepository.save.mockResolvedValue({
        ...mockCertification,
        status: CertificationStatus.APPROVED,
      });

      await service.approve(1, 100);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CertificationStatus.APPROVED,
          reviewedBy: 100,
          reviewedAt: expect.any(Date),
        }),
      );
    });

    it('应该抛出异常当认证不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.approve(999, 100)).rejects.toThrow(NotFoundException);
      await expect(service.approve(999, 100)).rejects.toThrow('认证不存在');
    });
  });

  describe('reject', () => {
    it('应该拒绝认证', async () => {
      mockRepository.findOne.mockResolvedValue(mockCertification);
      mockRepository.save.mockResolvedValue({
        ...mockCertification,
        status: CertificationStatus.REJECTED,
      });

      await service.reject(1, 100, '资料不清晰');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CertificationStatus.REJECTED,
          rejectReason: '资料不清晰',
          reviewedBy: 100,
          reviewedAt: expect.any(Date),
        }),
      );
    });

    it('应该抛出异常当认证不存在', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.reject(999, 100, '原因')).rejects.toThrow(NotFoundException);
      await expect(service.reject(999, 100, '原因')).rejects.toThrow('认证不存在');
    });
  });
});
