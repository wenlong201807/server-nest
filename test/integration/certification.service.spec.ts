import { Test, TestingModule } from '@nestjs/testing';
import { CertificationService } from '../../src/modules/certification/certification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Certification } from '../../src/modules/certification/entities/certification.entity';
import { Repository } from 'typeorm';
import { CertificationType, CertificationStatus } from '../../src/common/constants';

describe('CertificationService (Integration)', () => {
  let service: CertificationService;
  let repository: Repository<Certification>;

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

  describe('Certification workflow', () => {
    it('should complete full certification approval workflow', async () => {
      const userId = 1;
      const reviewerId = 100;
      const dto = {
        type: CertificationType.ID_CARD,
        imageUrl: 'https://example.com/id-card.jpg',
        description: '身份证认证',
      };

      // Step 1: Create certification
      const createdCert = {
        id: 1,
        userId,
        type: dto.type,
        imageUrl: dto.imageUrl,
        description: dto.description,
        status: CertificationStatus.PENDING,
        rejectReason: null,
        reviewedAt: null,
        reviewedBy: null,
        createdAt: new Date(),
        user: null,
      };

      mockRepository.create.mockReturnValue(createdCert);
      mockRepository.save.mockResolvedValue(createdCert);

      const certification = await service.create(userId, dto);

      expect(certification.status).toBe(CertificationStatus.PENDING);
      expect(certification.userId).toBe(userId);

      // Step 2: Approve certification
      mockRepository.findOne.mockResolvedValue(certification);
      const approvedCert = {
        ...certification,
        status: CertificationStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      };
      mockRepository.save.mockResolvedValue(approvedCert);

      await service.approve(certification.id, reviewerId);

      expect(mockRepository.save).toHaveBeenCalled();
      const savedCert = mockRepository.save.mock.calls[1][0];
      expect(savedCert.status).toBe(CertificationStatus.APPROVED);
      expect(savedCert.reviewedBy).toBe(reviewerId);
    });

    it('should complete full certification rejection workflow', async () => {
      const userId = 1;
      const reviewerId = 100;
      const rejectReason = '证件照片模糊，无法识别';
      const dto = {
        type: CertificationType.EDUCATION,
        imageUrl: 'https://example.com/diploma.jpg',
      };

      // Step 1: Create certification
      const createdCert = {
        id: 2,
        userId,
        type: dto.type,
        imageUrl: dto.imageUrl,
        description: null,
        status: CertificationStatus.PENDING,
        rejectReason: null,
        reviewedAt: null,
        reviewedBy: null,
        createdAt: new Date(),
        user: null,
      };

      mockRepository.create.mockReturnValue(createdCert);
      mockRepository.save.mockResolvedValue(createdCert);

      const certification = await service.create(userId, dto);

      expect(certification.status).toBe(CertificationStatus.PENDING);

      // Step 2: Reject certification
      mockRepository.findOne.mockResolvedValue(certification);
      const rejectedCert = {
        ...certification,
        status: CertificationStatus.REJECTED,
        rejectReason,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      };
      mockRepository.save.mockResolvedValue(rejectedCert);

      await service.reject(certification.id, reviewerId, rejectReason);

      expect(mockRepository.save).toHaveBeenCalled();
      const savedCert = mockRepository.save.mock.calls[1][0];
      expect(savedCert.status).toBe(CertificationStatus.REJECTED);
      expect(savedCert.rejectReason).toBe(rejectReason);
      expect(savedCert.reviewedBy).toBe(reviewerId);
    });
  });

  describe('Multiple certifications management', () => {
    it('should handle multiple certifications for same user', async () => {
      const userId = 1;
      const certifications = [
        {
          id: 1,
          userId,
          type: CertificationType.ID_CARD,
          imageUrl: 'https://example.com/id.jpg',
          status: CertificationStatus.APPROVED,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          userId,
          type: CertificationType.EDUCATION,
          imageUrl: 'https://example.com/edu.jpg',
          status: CertificationStatus.PENDING,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 3,
          userId,
          type: CertificationType.HOUSE,
          imageUrl: 'https://example.com/house.jpg',
          status: CertificationStatus.REJECTED,
          createdAt: new Date('2024-01-03'),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(certifications),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getList(userId);

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe(CertificationType.ID_CARD);
      expect(result[1].type).toBe(CertificationType.EDUCATION);
      expect(result[2].type).toBe(CertificationType.HOUSE);
    });

    it('should filter certifications by status correctly', async () => {
      const userId = 1;
      const approvedCerts = [
        {
          id: 1,
          userId,
          type: CertificationType.ID_CARD,
          status: CertificationStatus.APPROVED,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(approvedCerts),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getList(userId, CertificationStatus.APPROVED);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(CertificationStatus.APPROVED);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cert.status = :status', {
        status: CertificationStatus.APPROVED,
      });
    });
  });

  describe('All certification types', () => {
    it('should support all certification types', async () => {
      const userId = 1;
      const allTypes = [
        CertificationType.HOUSE,
        CertificationType.EDUCATION,
        CertificationType.ID_CARD,
        CertificationType.BUSINESS,
        CertificationType.DRIVER,
        CertificationType.UTILITY,
      ];

      for (const type of allTypes) {
        const dto = {
          type,
          imageUrl: `https://example.com/${type}.jpg`,
          description: `${type}认证`,
        };

        const cert = {
          id: Math.random(),
          userId,
          ...dto,
          status: CertificationStatus.PENDING,
          rejectReason: null,
          reviewedAt: null,
          reviewedBy: null,
          createdAt: new Date(),
          user: null,
        };

        mockRepository.create.mockReturnValue(cert);
        mockRepository.save.mockResolvedValue(cert);

        const result = await service.create(userId, dto);

        expect(result.type).toBe(type);
        expect(result.status).toBe(CertificationStatus.PENDING);
      }
    });
  });
});
