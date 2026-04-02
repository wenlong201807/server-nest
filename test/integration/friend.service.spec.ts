import { Test, TestingModule } from '@nestjs/testing';
import { FriendService } from '../../src/modules/friend/friend.service';
import { UserService } from '../../src/modules/user/user.service';
import { PointsService } from '../../src/modules/points/points.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FriendStatus } from '../../src/common/constants';

describe('FriendService (Integration)', () => {
  let service: FriendService;
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
          provide: 'FriendshipRepository',
          useValue: mockFriendshipRepository,
        },
        {
          provide: 'UserBlacklistRepository',
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
    userService = module.get<UserService>(UserService);
    pointsService = module.get<PointsService>(PointsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('follow workflow', () => {
    it('should complete full follow to friend workflow', async () => {
      // Step 1: Follow user
      mockFriendshipRepository.findOne.mockResolvedValue(null);
      const newFriendship = {
        id: 1,
        userId: 1,
        friendId: 2,
        status: FriendStatus.FOLLOWING,
        chatCount: 0,
      };
      mockFriendshipRepository.create.mockReturnValue(newFriendship);
      mockFriendshipRepository.save.mockResolvedValue(newFriendship);

      const followResult = await service.follow(1, 2);
      expect(followResult.status).toBe(FriendStatus.FOLLOWING);

      // Step 2: Simulate chat messages
      mockFriendshipRepository.findOne.mockResolvedValue(newFriendship);
      for (let i = 0; i < 8; i++) {
        newFriendship.chatCount = i + 1;
        mockFriendshipRepository.save.mockResolvedValue(newFriendship);
        await service.updateChatCount(1, 2);
      }

      // Step 3: Unlock chat
      const friendshipWithChats = { ...newFriendship, chatCount: 8 };
      mockFriendshipRepository.findOne
        .mockResolvedValueOnce(friendshipWithChats)
        .mockResolvedValueOnce({ ...friendshipWithChats, userId: 2, friendId: 1 });
      mockUserService.findById.mockResolvedValue(mockUser);
      mockPointsService.addPoints.mockResolvedValue(undefined);
      mockFriendshipRepository.save.mockResolvedValue({
        ...friendshipWithChats,
        status: FriendStatus.FRIEND,
      });

      const unlockResult = await service.unlockChat(1, 2);
      expect(unlockResult.unlocked).toBe(true);
      expect(unlockResult.pointsConsumed).toBe(50);
    });
  });

  describe('block and unblock workflow', () => {
    it('should block user and prevent interactions', async () => {
      // Block user
      mockBlacklistRepository.findOne.mockResolvedValue(null);
      const blacklist = {
        id: 1,
        userId: 1,
        blockedUserId: 2,
        reason: '骚扰',
      };
      mockBlacklistRepository.create.mockReturnValue(blacklist);
      mockBlacklistRepository.save.mockResolvedValue(blacklist);

      await service.blockUser(1, 2, '骚扰');

      // Check if blocked
      mockBlacklistRepository.findOne.mockResolvedValue(blacklist);
      const isBlocked = await service.isBlocked(1, 2);
      expect(isBlocked).toBe(true);

      // Get blocklist
      mockBlacklistRepository.find.mockResolvedValue([
        { ...blacklist, blockedUser: mockTargetUser },
      ]);
      const blocklist = await service.getBlocklist(1);
      expect(blocklist).toHaveLength(1);
      expect(blocklist[0].user.id).toBe(2);
    });
  });

  describe('friendship status checks', () => {
    it('should correctly determine friendship status at different stages', async () => {
      // Not following
      mockFriendshipRepository.findOne.mockResolvedValue(null);
      mockUserService.findById.mockResolvedValue(mockUser);

      let status = await service.getFriendshipStatus(1, 2);
      expect(status.isFollowing).toBe(false);
      expect(status.isFriend).toBe(false);
      expect(status.canChat).toBe(false);

      // Following but not enough chats
      const followingFriendship = {
        userId: 1,
        friendId: 2,
        status: FriendStatus.FOLLOWING,
        chatCount: 3,
      };
      mockFriendshipRepository.findOne.mockResolvedValue(followingFriendship);

      status = await service.getFriendshipStatus(1, 2);
      expect(status.isFollowing).toBe(true);
      expect(status.isFriend).toBe(false);
      expect(status.canChat).toBe(false);
      expect(status.chatCount).toBe(3);

      // Following with enough chats
      followingFriendship.chatCount = 8;
      mockFriendshipRepository.findOne.mockResolvedValue(followingFriendship);

      status = await service.getFriendshipStatus(1, 2);
      expect(status.canChat).toBe(true);

      // Friends
      const friendFriendship = {
        ...followingFriendship,
        status: FriendStatus.FRIEND,
      };
      mockFriendshipRepository.findOne.mockResolvedValue(friendFriendship);

      status = await service.getFriendshipStatus(1, 2);
      expect(status.isFriend).toBe(true);
      expect(status.canChat).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle deleting non-existent friendship', async () => {
      mockFriendshipRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteFriend(1, 2)).rejects.toThrow(NotFoundException);
    });

    it('should prevent following self', async () => {
      await expect(service.follow(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate follows', async () => {
      mockFriendshipRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 1,
        friendId: 2,
        status: FriendStatus.FOLLOWING,
      });

      await expect(service.follow(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate blocks', async () => {
      mockBlacklistRepository.findOne.mockResolvedValue({ id: 1 });

      await expect(service.blockUser(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should handle insufficient points for unlock', async () => {
      const friendship = {
        userId: 1,
        friendId: 2,
        status: FriendStatus.FOLLOWING,
        chatCount: 8,
      };
      mockFriendshipRepository.findOne.mockResolvedValue(friendship);
      mockUserService.findById.mockResolvedValue({ ...mockUser, points: 30 });

      await expect(service.unlockChat(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.unlockChat(1, 2)).rejects.toThrow('积分不足');
    });
  });

  describe('list operations', () => {
    it('should return correct friend and following lists', async () => {
      const friendships = [
        {
          id: 1,
          userId: 1,
          friendId: 2,
          status: FriendStatus.FRIEND,
          friend: mockTargetUser,
        },
        {
          id: 2,
          userId: 1,
          friendId: 3,
          status: FriendStatus.FOLLOWING,
          friend: { id: 3, nickname: '用户3', avatarUrl: 'avatar3.jpg', isVerified: false },
        },
      ];

      // Get friend list (only FRIEND status)
      mockFriendshipRepository.find.mockResolvedValue([friendships[0]]);
      const friendList = await service.getFriendList(1);
      expect(friendList).toHaveLength(1);
      expect(friendList[0].user.id).toBe(2);

      // Get following list (all statuses)
      mockFriendshipRepository.find.mockResolvedValue(friendships);
      const followingList = await service.getFollowingList(1);
      expect(followingList).toHaveLength(2);
    });
  });
});
