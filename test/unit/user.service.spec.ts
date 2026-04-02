import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../src/modules/user/user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/modules/user/entities/user.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

describe('UserService (Unit)', () => {
  let service: UserService;
  let repository: Repository<User>;

  const mockUser: User = {
    id: 1,
    mobile: '13800000001',
    password: 'hashedPassword',
    nickname: '测试用户',
    avatar: null,
    gender: 1,
    birthday: null,
    height: null,
    weight: null,
    education: null,
    occupation: null,
    income: null,
    city: null,
    hometown: null,
    introduction: null,
    inviteCode: 'TEST001',
    inviterCode: null,
    points: 2000,
    status: 0,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    profile: null,
    certifications: [],
    pointsLogs: [],
    posts: [],
    comments: [],
    likes: [],
    friendships: [],
    friends: [],
    sentMessages: [],
    receivedMessages: [],
    blacklist: [],
    blockedBy: [],
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow('用户不存在');
    });
  });

  describe('findByMobile', () => {
    it('should return a user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByMobile('13800000001');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { mobile: '13800000001' },
      });
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByMobile('19999999999');

      expect(result).toBeNull();
    });
  });

  describe('updatePoints', () => {
    it('should increase user points', async () => {
      const userWithPoints = { ...mockUser, points: 2000 };
      mockRepository.findOne.mockResolvedValue(userWithPoints);
      mockRepository.save.mockResolvedValue({ ...userWithPoints, points: 2100 });

      const result = await service.updatePoints(1, 100);

      expect(result.points).toBe(2100);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should decrease user points', async () => {
      const userWithPoints = { ...mockUser, points: 2000 };
      mockRepository.findOne.mockResolvedValue(userWithPoints);
      mockRepository.save.mockResolvedValue({ ...userWithPoints, points: 1900 });

      const result = await service.updatePoints(1, -100);

      expect(result.points).toBe(1900);
    });

    it('should not allow negative points', async () => {
      const userWithPoints = { ...mockUser, points: 100 };
      mockRepository.findOne.mockResolvedValue(userWithPoints);
      mockRepository.save.mockResolvedValue({ ...userWithPoints, points: 0 });

      const result = await service.updatePoints(1, -200);

      expect(result.points).toBe(0);
    });
  });

  describe('delete', () => {
    it('should soft delete a user', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({ ...mockUser, deletedAt: new Date() });

      await service.delete(1);

      expect(mockRepository.save).toHaveBeenCalled();
      const savedUser = mockRepository.save.mock.calls[0][0];
      expect(savedUser.deletedAt).toBeDefined();
    });
  });
});
