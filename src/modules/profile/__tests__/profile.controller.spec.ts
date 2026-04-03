import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from '../profile.controller';
import { ProfileService } from '../profile.service';

describe('ProfileController', () => {
  let controller: ProfileController;
  let profileService: any;

  beforeEach(async () => {
    profileService = {
      findByUserId: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: profileService,
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('应该调用 profileService.findByUserId', async () => {
      const mockProfile = {
        id: 1,
        userId: 1,
        nickname: 'TestUser',
        avatar: 'https://example.com/avatar.jpg',
        bio: '这是个人简介',
      };
      profileService.findByUserId.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(1);

      expect(result).toEqual(mockProfile);
      expect(profileService.findByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('updateProfile', () => {
    it('应该调用 profileService.update', async () => {
      const userId = 1;
      const dto = {
        nickname: 'UpdatedUser',
        avatar: 'https://example.com/new-avatar.jpg',
        bio: '更新后的简介',
      };
      const mockResult = {
        id: 1,
        userId,
        ...dto,
      };
      profileService.update.mockResolvedValue(mockResult);

      const result = await controller.updateProfile(userId, dto);

      expect(result).toEqual(mockResult);
      expect(profileService.update).toHaveBeenCalledWith(userId, dto);
    });
  });
});
