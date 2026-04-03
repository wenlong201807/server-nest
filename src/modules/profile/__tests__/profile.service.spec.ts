import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from '../profile.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserProfile } from '../entities/profile.entity';

describe('ProfileService', () => {
  let service: ProfileService;
  let mockRepository: any;

  const mockProfile = {
    id: 1,
    userId: 1,
    realName: 'Test User',
    birthDate: new Date('1990-01-01'),
    hometown: 'Test City',
    residence: 'Current City',
    height: 175,
    weight: 70,
    occupation: 'Engineer',
    income: 10000,
    education: 'Bachelor',
    bio: 'Test bio',
    showLocation: true,
    latitude: 39.9042,
    longitude: 116.4074,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('应该返回存在的用户资料', async () => {
      mockRepository.findOne.mockResolvedValue(mockProfile);

      const result = await service.findByUserId(1);

      expect(result).toEqual(mockProfile);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { userId: 1 } });
    });

    it('应该创建新资料当不存在时', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockProfile);
      mockRepository.save.mockResolvedValue(mockProfile);

      const result = await service.findByUserId(1);

      expect(result).toEqual(mockProfile);
      expect(mockRepository.create).toHaveBeenCalledWith({ userId: 1 });
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('应该创建用户资料', async () => {
      mockRepository.create.mockReturnValue(mockProfile);
      mockRepository.save.mockResolvedValue(mockProfile);

      const result = await service.create(1);

      expect(result).toEqual(mockProfile);
      expect(mockRepository.create).toHaveBeenCalledWith({ userId: 1 });
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('应该更新存在的用户资料', async () => {
      const dto = { bio: 'Updated bio', residence: 'New City' };
      const updatedProfile = { ...mockProfile, ...dto };

      mockRepository.findOne.mockResolvedValue(mockProfile);
      mockRepository.save.mockResolvedValue(updatedProfile);

      const result = await service.update(1, dto);

      expect(result.bio).toBe('Updated bio');
      expect(result.residence).toBe('New City');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('应该创建并更新资料当不存在时', async () => {
      const dto = { bio: 'New bio' };
      const newProfile = { userId: 1, ...dto };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(newProfile);
      mockRepository.save.mockResolvedValue(newProfile);

      const result = await service.update(1, dto);

      expect(result.bio).toBe('New bio');
      expect(mockRepository.create).toHaveBeenCalledWith({ userId: 1 });
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
});
