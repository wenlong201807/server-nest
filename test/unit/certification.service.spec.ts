import { Test, TestingModule } from '@nestjs/testing';
import { CertificationService } from '../../src/modules/certification/certification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Certification } from '../../src/modules/certification/entities/certification.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CertificationType, CertificationStatus } from '../../src/common/constants';

describe('CertificationService (Unit)', () => {
  let service: CertificationService;
  let repository: Repository<Certification>;

  const mockCertification: Certification = {
    id: 1,
    userId: 1,
    type: CertificationType.ID_CARD,
    imageUrl: 'https://example.com/id-card.jpg',
    description: '身份证认证',
    status: CertificationStatus.PENDING,
    rejectReason: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: new Date(),
    user: null,
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
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
    repository = module.get<Repository<Certification>>(getRepositoryToken(Certification));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new certification', async () => {
      const dto = {
        type: CertificationType.ID_CARD,
        imageUrl: 'https://example.com/id-card.jpg',
        description: '身份证认证',
      };

      mockRepository.create.mockReturnValue(mockCertification);
      mockRepository.save.mockResolvedValue(mockCertification);

      const result = await service.create(1, dto);

      expect(result).toEqual(mockCertification);
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: 1,
        type: dto.type,
        imageUrl: dto.imageUrl,
        description: dto.description,
        status: CertificationStatus.PENDING,
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should create certification with different types', async () => {
      const types = [
        CertificationType.HOUSE,
        CertificationType.EDUCATION,
        CertificationType.BUSINESS,
        CertificationType.DRIVER,
        CertificationType.UTILITY,
      ];

      for (const type of types) {
        const dto = {
          type,
          imageUrl: 'https://example.com/cert.jpg',
        };

        mockRepository.create.mockReturnValue({ ...mockCertification, type });
        mockRepository.save.mockResolvedValue({ ...mockCertification, type });

        const result = await service.create(1, dto);

        expect(result.type).toBe(type);
      }
    });
  });

  describe('getList', () => {
    it('should return all certifications for a user', async () => {
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
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should filter certifications by status', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCertification]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getList(1, CertificationStatus.APPROVED);

      expect(result).toEqual([mockCertification]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cert.status = :status', {
        status: CertificationStatus.APPROVED,
      });
    });

    it('should return empty array when no certifications found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getList(999);

      expect(result).toEqual([]);
    });
  });

  describe('approve', () => {
    it('should approve a certification', async () => {
      const reviewerId = 100;
      mockRepository.findOne.mockResolvedValue(mockCertification);
      mockRepository.save.mockResolvedValue({
        ...mockCertification,
        status: CertificationStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: expect.any(Date),
      });

      await service.approve(1, reviewerId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockRepository.save).toHaveBeenCalled();
      const savedCert = mockRepository.save.mock.calls[0][0];
      expect(savedCert.status).toBe(CertificationStatus.APPROVED);
      expect(savedCert.reviewedBy).toBe(reviewerId);
      expect(savedCert.reviewedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when certification not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.approve(999, 100)).rejects.toThrow(NotFoundException);
      await expect(service.approve(999, 100)).rejects.toThrow('认证不存在');
    });
  });

  describe('reject', () => {
    it('should reject a certification with reason', async () => {
      const reviewerId = 100;
      const reason = '证件照片不清晰';
      mockRepository.findOne.mockResolvedValue(mockCertification);
      mockRepository.save.mockResolvedValue({
        ...mockCertification,
        status: CertificationStatus.REJECTED,
        rejectReason: reason,
        reviewedBy: reviewerId,
        reviewedAt: expect.any(Date),
      });

      await service.reject(1, reviewerId, reason);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockRepository.save).toHaveBeenCalled();
      const savedCert = mockRepository.save.mock.calls[0][0];
      expect(savedCert.status).toBe(CertificationStatus.REJECTED);
      expect(savedCert.rejectReason).toBe(reason);
      expect(savedCert.reviewedBy).toBe(reviewerId);
      expect(savedCert.reviewedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when certification not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.reject(999, 100, '原因')).rejects.toThrow(NotFoundException);
      await expect(service.reject(999, 100, '原因')).rejects.toThrow('认证不存在');
    });
  });
});
