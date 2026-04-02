import { Test, TestingModule } from '@nestjs/testing';
import { FriendService } from '../../src/modules/friend/friend.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Friendship } from '../../src/modules/friend/entities/friendship.entity';
import { UserBlacklist } from '../../src/modules/friend/entities/blacklist.entity';
import { UserService } from '../../src/modules/user/user.service';
import { PointsService } from '../../src/modules/points/points.service';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FriendStatus } from '../../src/common/constants';

describe('FriendService (Unit)', () => {
  let service: FriendService;
  let friendshipRepository: Repository<Friendship>;
  let blacklistRepository: Repository<UserBlacklist>;
  let userService: UserService;
  let pointsService: PointsService;

  const mockUser = {
    id: 1,
    mobile: '13800000001',
    nickname: '测试用户',
    avatarUrl: 'avatar1.jpg',
    isVerified: true,
    points: 2000,
  };

  const mockTargetUser = {
    id: 2,
    mobile: '13800000002',
    nickname: '目标用户',
    avatarUrl: 'avatar2.jpg',
    isVerified: false,
    points: 1500,
  };

  const mockFriendship = {
    id: 1,
    userId: 1,
    friendId: 2,
    status: FriendStatus.FOLLOWING,
    chatCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    friend: mockTargetUser,
  };

  const mockFriendshipRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockBlacklistRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserService = {
    findById: jest.fn(),
  };

  const mockPointsService = {
    addPoints: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendService,
        {
          provide: getRepositoryToken(Friendship),
          useValue: mockFriendshipRepository,
        },
        {
          provide: getRepositoryToken(UserBlacklist),
          useValue: mockBlacklistRepository,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: PointsService,
          useValue: mockPointsService,
        },
      ],
    }).compile();

    service = module.get<FriendService>(FriendService);
    friendshipRepository = module.get<Repository<Friendship>>(getRepositoryToken(Friendship));
    blacklistRepository = module.get<Repository<UserBlacklist>>(getRepositoryToken(UserBlacklist));
    userService = module.get<UserService>(UserService);
    pointsService = module.get<PointsService>(PointsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFriendList', () => {
    it('should return friend list with user details', async () => {
      const friendList = [
        { ...mockFriendship, status: FriendStatus.FRIEND },
      ];
      mockFriendshipRepository.find.mockResolvedValue(friendList);

      const result = await service.getFriendList(1);

      expect(result).toHaveLength(1);
      expect(result[0].user).toEqual({
        id: mockTargetUser.id,
        nickname: mockTargetUser.nickname,
        avatarUrl: mockTargetUser.avatarUrl,
        verified: mockTargetUser.isVerified,
      });
      expect(mockFriendshipRepository.find).toHaveBeenCalledWith({
        where: { userId: 1, status: FriendStatus.FRIEND },
        relations: ['friend'],
      });
    });

    it('should return empty array when no friends', async () => {
      mockFriendshipRepository.find.mockResolvedValue([]);

      const result = await service.getFriendList(1);

      expect(result).toEqual([]);
    });
  });

  describe('getFollowingList', () => {
    it('should return following list', async () => {
      mockFriendshipRepository.find.mockResolvedValue([mockFriendship]);

      const result = await service.getFollowingList(1);

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe(2);
      expect(mockFriendshipRepository.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['friend'],
      });
    });
  });

  describe('follow', () => {
    it('should create a new friendship', async () => {
      mockFriendshipRepository.findOne.mockResolvedValue(null);
      mockFriendshipRepository.create.mockReturnValue(mockFriendship);
      mockFriendshipRepository.save.mockResolvedValue(mockFriendship);

      const result = await service.follow(1, 2);

      expect(result).toEqual(mockFriendship);
      expect(mockFriendshipRepository.create).toHaveBeenCalledWith({
        userId: 1,
        friendId: 2,
        status: FriendStatus.FOLLOWING,
      });
      expect(mockFriendshipRepository.save).toHaveBeenCalled();
    });

    it('should throw error when trying to follow self', async () => {
      await expect(service.follow(1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.follow(1, 1)).rejects.toThrow('不能添加自己');
    });

    it('should throw error when relationship already exists', async () => {
      mockFriendshipRepository.findOne.mockResolvedValue(mockFriendship);

      await expect(service.follow(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.follow(1, 2)).rejects.toThrow('关系已存在');
    });
  });

  describe('unlockChat', () => {
    it('should unlock chat successfully', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: 8,
        status: FriendStatus.FOLLOWING,
      };
      mockFriendshipRepository.findOne
        .mockResolvedValueOnce(friendship)
        .mockResolvedValueOnce({ ...friendship, userId: 2, friendId: 1 });
      mockUserService.findById.mockResolvedValue(mockUser);
      mockPointsService.addPoints.mockResolvedValue(undefined);
      mockFriendshipRepository.save.mockResolvedValue({
        ...friendship,
        status: FriendStatus.FRIEND,
      });

      const result = await service.unlockChat(1, 2);

      expect(result).toEqual({ unlocked: true, pointsConsumed: 50 });
      expect(mockPointsService.addPoints).toHaveBeenCalledWith(1, -50, 'unlock_chat', 2, '解锁私聊');
      expect(mockFriendshipRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should throw error when not following', async () => {
      mockFriendshipRepository.findOne.mockResolvedValue(null);

      await expect(service.unlockChat(1, 2)).rejects.toThrow(NotFoundException);
      await expect(service.unlockChat(1, 2)).rejects.toThrow('请先关注对方');
    });

    it('should throw error when already friends', async () => {
      const friendship = {
        ...mockFriendship,
        status: FriendStatus.FRIEND,
      };
      mockFriendshipRepository.findOne.mockResolvedValue(friendship);

      await expect(service.unlockChat(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.unlockChat(1, 2)).rejects.toThrow('已经是好友');
    });

    it('should throw error when chat count is insufficient', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: 5,
      };
      mockFriendshipRepository.findOne.mockResolvedValue(friendship);

      await expect(service.unlockChat(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.unlockChat(1, 2)).rejects.toThrow('需要先互发8条消息');
    });

    it('should throw error when points are insufficient', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: 8,
      };
      const poorUser = { ...mockUser, points: 30 };
      mockFriendshipRepository.findOne.mockResolvedValue(friendship);
      mockUserService.findById.mockResolvedValue(poorUser);

      await expect(service.unlockChat(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.unlockChat(1, 2)).rejects.toThrow('积分不足');
    });
  });

  describe('deleteFriend', () => {
    it('should delete friendship successfully', async () => {
      mockFriendshipRepository.findOne.mockResolvedValue(mockFriendship);
      mockFriendshipRepository.remove.mockResolvedValue(mockFriendship);

      await service.deleteFriend(1, 2);

      expect(mockFriendshipRepository.remove).toHaveBeenCalledWith(mockFriendship);
    });

    it('should throw error when friendship not found', async () => {
      mockFriendshipRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteFriend(1, 2)).rejects.toThrow(NotFoundException);
      await expect(service.deleteFriend(1, 2)).rejects.toThrow('好友不存在');
    });
  });

  describe('blockUser', () => {
    it('should block user successfully', async () => {
      const blacklist = {
        id: 1,
        userId: 1,
        blockedUserId: 2,
        reason: '骚扰',
        createdAt: new Date(),
      };
      mockBlacklistRepository.findOne.mockResolvedValue(null);
      mockBlacklistRepository.create.mockReturnValue(blacklist);
      mockBlacklistRepository.save.mockResolvedValue(blacklist);

      await service.blockUser(1, 2, '骚扰');

      expect(mockBlacklistRepository.create).toHaveBeenCalledWith({
        userId: 1,
        blockedUserId: 2,
        reason: '骚扰',
      });
      expect(mockBlacklistRepository.save).toHaveBeenCalled();
    });

    it('should throw error when user already blocked', async () => {
      mockBlacklistRepository.findOne.mockResolvedValue({ id: 1 });

      await expect(service.blockUser(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.blockUser(1, 2)).rejects.toThrow('已在黑名单中');
    });
  });

  describe('getBlocklist', () => {
    it('should return blocklist with user details', async () => {
      const blacklist = [
        {
          id: 1,
          userId: 1,
          blockedUserId: 2,
          reason: '骚扰',
          createdAt: new Date(),
          blockedUser: mockTargetUser,
        },
      ];
      mockBlacklistRepository.find.mockResolvedValue(blacklist);

      const result = await service.getBlocklist(1);

      expect(result).toHaveLength(1);
      expect(result[0].user).toEqual({
        id: mockTargetUser.id,
        nickname: mockTargetUser.nickname,
        avatarUrl: mockTargetUser.avatarUrl,
      });
    });
  });

  describe('isBlocked', () => {
    it('should return true when user is blocked', async () => {
      mockBlacklistRepository.findOne.mockResolvedValue({ id: 1 });

      const result = await service.isBlocked(1, 2);

      expect(result).toBe(true);
    });

    it('should return false when user is not blocked', async () => {
      mockBlacklistRepository.findOne.mockResolvedValue(null);

      const result = await service.isBlocked(1, 2);

      expect(result).toBe(false);
    });
  });

  describe('isFriend', () => {
    it('should return true when users are friends', async () => {
      mockFriendshipRepository.findOne.mockResolvedValue({
        ...mockFriendship,
        status: FriendStatus.FRIEND,
      });

      const result = await service.isFriend(1, 2);

      expect(result).toBe(true);
    });

    it('should return false when users are not friends', async () => {
      mockFriendshipRepository.findOne.mockResolvedValue(null);

      const result = await service.isFriend(1, 2);

      expect(result).toBe(false);
    });
  });

  describe('getFriendshipStatus', () => {
    it('should return complete friendship status', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: 5,
        status: FriendStatus.FOLLOWING,
      };
      mockFriendshipRepository.findOne.mockResolvedValue(friendship);
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.getFriendshipStatus(1, 2);

      expect(result).toEqual({
        isFriend: false,
        isFollowing: true,
        canChat: false,
        chatCount: 5,
        requiredPoints: 50,
        currentPoints: 2000,
      });
    });

    it('should indicate can chat when requirements met', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: 8,
        status: FriendStatus.FOLLOWING,
      };
      mockFriendshipRepository.findOne.mockResolvedValue(friendship);
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.getFriendshipStatus(1, 2);

      expect(result.canChat).toBe(true);
    });
  });

  describe('updateChatCount', () => {
    it('should increment chat count', async () => {
      const friendship = { ...mockFriendship, chatCount: 3 };
      mockFriendshipRepository.findOne.mockResolvedValue(friendship);
      mockFriendshipRepository.save.mockResolvedValue({
        ...friendship,
        chatCount: 4,
      });

      await service.updateChatCount(1, 2);

      expect(mockFriendshipRepository.save).toHaveBeenCalledWith({
        ...friendship,
        chatCount: 4,
      });
    });

    it('should handle non-existent friendship gracefully', async () => {
      mockFriendshipRepository.findOne.mockResolvedValue(null);

      await service.updateChatCount(1, 2);

      expect(mockFriendshipRepository.save).not.toHaveBeenCalled();
    });
  });
});
