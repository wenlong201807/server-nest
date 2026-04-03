import { Test, TestingModule } from '@nestjs/testing';
import { FriendService } from '../friend.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Friendship } from '../entities/friendship.entity';
import { UserBlacklist } from '../entities/blacklist.entity';
import { UserService } from '../../user/user.service';
import { PointsService } from '../../points/points.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FriendStatus, REQUIRED_CHAT_COUNT, UNLOCK_FRIEND_POINTS } from '@common/constants';

describe('FriendService', () => {
  let service: FriendService;
  let friendshipRepository: any;
  let blacklistRepository: any;
  let userService: any;
  let pointsService: any;

  const mockUser = {
    id: 1,
    mobile: '13800138000',
    nickname: 'User 1',
    avatarUrl: 'avatar1.jpg',
    isVerified: true,
    points: 1000,
  };

  const mockFriend = {
    id: 2,
    mobile: '13800138001',
    nickname: 'User 2',
    avatarUrl: 'avatar2.jpg',
    isVerified: false,
    points: 500,
  };

  const mockFriendship = {
    id: 1,
    userId: 1,
    friendId: 2,
    status: FriendStatus.FOLLOWING,
    chatCount: 0,
    friend: mockFriend,
  };

  beforeEach(async () => {
    friendshipRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    blacklistRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    userService = {
      findById: jest.fn(),
    };

    pointsService = {
      addPoints: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendService,
        {
          provide: getRepositoryToken(Friendship),
          useValue: friendshipRepository,
        },
        {
          provide: getRepositoryToken(UserBlacklist),
          useValue: blacklistRepository,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: PointsService,
          useValue: pointsService,
        },
      ],
    }).compile();

    service = module.get<FriendService>(FriendService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFriendList', () => {
    it('应该返回好友列表', async () => {
      const friendships = [
        { ...mockFriendship, status: FriendStatus.FRIEND },
      ];
      friendshipRepository.find.mockResolvedValue(friendships);

      const result = await service.getFriendList(1);

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe(2);
      expect(result[0].user.nickname).toBe('User 2');
      expect(friendshipRepository.find).toHaveBeenCalledWith({
        where: { userId: 1, status: FriendStatus.FRIEND },
        relations: ['friend'],
      });
    });

    it('应该返回空数组当没有好友', async () => {
      friendshipRepository.find.mockResolvedValue([]);

      const result = await service.getFriendList(1);

      expect(result).toEqual([]);
    });
  });

  describe('getFollowingList', () => {
    it('应该返回关注列表', async () => {
      const friendships = [mockFriendship];
      friendshipRepository.find.mockResolvedValue(friendships);

      const result = await service.getFollowingList(1);

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe(2);
      expect(friendshipRepository.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['friend'],
      });
    });
  });

  describe('follow', () => {
    it('应该成功关注用户', async () => {
      friendshipRepository.findOne.mockResolvedValue(null);
      friendshipRepository.create.mockReturnValue(mockFriendship);
      friendshipRepository.save.mockResolvedValue(mockFriendship);

      const result = await service.follow(1, 2);

      expect(result).toEqual(mockFriendship);
      expect(friendshipRepository.create).toHaveBeenCalledWith({
        userId: 1,
        friendId: 2,
        status: FriendStatus.FOLLOWING,
      });
    });

    it('应该拒绝关注自己', async () => {
      await expect(service.follow(1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.follow(1, 1)).rejects.toThrow('不能添加自己');
    });

    it('应该拒绝重复关注', async () => {
      friendshipRepository.findOne.mockResolvedValue(mockFriendship);

      await expect(service.follow(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.follow(1, 2)).rejects.toThrow('关系已存在');
    });
  });

  describe('unlockChat', () => {
    it('应该成功解锁聊天', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: REQUIRED_CHAT_COUNT,
        status: FriendStatus.FOLLOWING,
      };
      friendshipRepository.findOne
        .mockResolvedValueOnce(friendship)
        .mockResolvedValueOnce({ userId: 2, friendId: 1, status: FriendStatus.FOLLOWING });
      userService.findById.mockResolvedValue(mockUser);
      pointsService.addPoints.mockResolvedValue(undefined);
      friendshipRepository.save.mockResolvedValue({ ...friendship, status: FriendStatus.FRIEND });

      const result = await service.unlockChat(1, 2);

      expect(result).toEqual({
        unlocked: true,
        pointsConsumed: UNLOCK_FRIEND_POINTS,
      });
      expect(pointsService.addPoints).toHaveBeenCalledWith(
        1,
        -UNLOCK_FRIEND_POINTS,
        expect.any(String),
        2,
        '解锁私聊'
      );
    });

    it('应该拒绝未关注的用户解锁', async () => {
      friendshipRepository.findOne.mockResolvedValue(null);

      await expect(service.unlockChat(1, 2)).rejects.toThrow(NotFoundException);
      await expect(service.unlockChat(1, 2)).rejects.toThrow('请先关注对方');
    });

    it('应该拒绝已经是好友的解锁', async () => {
      const friendship = {
        ...mockFriendship,
        status: FriendStatus.FRIEND,
      };
      friendshipRepository.findOne.mockResolvedValue(friendship);

      await expect(service.unlockChat(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.unlockChat(1, 2)).rejects.toThrow('已经是好友');
    });

    it('应该拒绝聊天次数不足', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: 5,
        status: FriendStatus.FOLLOWING,
      };
      friendshipRepository.findOne.mockResolvedValue(friendship);

      await expect(service.unlockChat(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.unlockChat(1, 2)).rejects.toThrow(/需要先互发.*条消息/);
    });

    it('应该拒绝积分不足', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: REQUIRED_CHAT_COUNT,
        status: FriendStatus.FOLLOWING,
      };
      const poorUser = { ...mockUser, points: 10 };
      friendshipRepository.findOne.mockResolvedValue(friendship);
      userService.findById.mockResolvedValue(poorUser);

      await expect(service.unlockChat(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.unlockChat(1, 2)).rejects.toThrow('积分不足');
    });
  });

  describe('deleteFriend', () => {
    it('应该成功删除好友', async () => {
      friendshipRepository.findOne.mockResolvedValue(mockFriendship);
      friendshipRepository.remove.mockResolvedValue(mockFriendship);

      await service.deleteFriend(1, 2);

      expect(friendshipRepository.remove).toHaveBeenCalledWith(mockFriendship);
    });

    it('应该拒绝删除不存在的好友', async () => {
      friendshipRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteFriend(1, 2)).rejects.toThrow(NotFoundException);
      await expect(service.deleteFriend(1, 2)).rejects.toThrow('好友不存在');
    });
  });

  describe('blockUser', () => {
    it('应该成功拉黑用户', async () => {
      const blacklist = {
        id: 1,
        userId: 1,
        blockedUserId: 2,
        reason: '骚扰',
      };
      blacklistRepository.findOne.mockResolvedValue(null);
      blacklistRepository.create.mockReturnValue(blacklist);
      blacklistRepository.save.mockResolvedValue(blacklist);

      const result = await service.blockUser(1, 2, '骚扰');

      expect(result).toEqual(blacklist);
      expect(blacklistRepository.create).toHaveBeenCalledWith({
        userId: 1,
        blockedUserId: 2,
        reason: '骚扰',
      });
    });

    it('应该拒绝重复拉黑', async () => {
      const existingBlacklist = {
        id: 1,
        userId: 1,
        blockedUserId: 2,
      };
      blacklistRepository.findOne.mockResolvedValue(existingBlacklist);

      await expect(service.blockUser(1, 2)).rejects.toThrow(BadRequestException);
      await expect(service.blockUser(1, 2)).rejects.toThrow('已在黑名单中');
    });
  });

  describe('unblockUser', () => {
    it('应该成功取消拉黑', async () => {
      const blacklist = {
        id: 1,
        userId: 1,
        blockedUserId: 2,
      };
      blacklistRepository.findOne.mockResolvedValue(blacklist);
      blacklistRepository.remove.mockResolvedValue(blacklist);

      await service.unblockUser(1, 2);

      expect(blacklistRepository.remove).toHaveBeenCalledWith(blacklist);
    });

    it('应该拒绝取消不存在的拉黑', async () => {
      blacklistRepository.findOne.mockResolvedValue(null);

      await expect(service.unblockUser(1, 2)).rejects.toThrow(NotFoundException);
      await expect(service.unblockUser(1, 2)).rejects.toThrow('黑名单记录不存在');
    });
  });

  describe('getBlocklist', () => {
    it('应该返回黑名单列表', async () => {
      const blockedUser = {
        id: 3,
        nickname: 'Blocked User',
        avatarUrl: 'blocked.jpg',
      };
      const blacklist = [
        {
          id: 1,
          userId: 1,
          blockedUserId: 3,
          reason: '骚扰',
          blockedUser,
        },
      ];
      blacklistRepository.find.mockResolvedValue(blacklist);

      const result = await service.getBlocklist(1);

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe(3);
      expect(result[0].user.nickname).toBe('Blocked User');
      expect(result[0].reason).toBe('骚扰');
      expect(blacklistRepository.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['blockedUser'],
      });
    });

    it('应该返回空数组当没有黑名单', async () => {
      blacklistRepository.find.mockResolvedValue([]);

      const result = await service.getBlocklist(1);

      expect(result).toEqual([]);
    });
  });

  describe('边界测试', () => {
    it('应该处理大量好友列表', async () => {
      const largeFriendList = Array.from({ length: 100 }, (_, i) => ({
        ...mockFriendship,
        id: i + 1,
        friendId: i + 2,
        friend: { ...mockFriend, id: i + 2 },
      }));
      friendshipRepository.find.mockResolvedValue(largeFriendList);

      const result = await service.getFriendList(1);

      expect(result).toHaveLength(100);
    });

    it('应该处理聊天次数边界值', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: REQUIRED_CHAT_COUNT - 1,
        status: FriendStatus.FOLLOWING,
      };
      friendshipRepository.findOne.mockResolvedValue(friendship);

      await expect(service.unlockChat(1, 2)).rejects.toThrow(/需要先互发1条消息/);
    });
  });

  describe('unlockChat - 双向关系更新', () => {
    it('应该在没有反向关系时成功解锁', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: REQUIRED_CHAT_COUNT,
        status: FriendStatus.FOLLOWING,
      };
      friendshipRepository.findOne
        .mockResolvedValueOnce(friendship)
        .mockResolvedValueOnce(null);
      userService.findById.mockResolvedValue(mockUser);
      pointsService.addPoints.mockResolvedValue(undefined);
      friendshipRepository.save.mockResolvedValue({ ...friendship, status: FriendStatus.FRIEND });

      const result = await service.unlockChat(1, 2);

      expect(result).toEqual({
        unlocked: true,
        pointsConsumed: UNLOCK_FRIEND_POINTS,
      });
      expect(friendshipRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('isBlocked', () => {
    it('应该返回true当用户被拉黑', async () => {
      const blacklist = {
        id: 1,
        userId: 2,
        blockedUserId: 1,
      };
      blacklistRepository.findOne.mockResolvedValue(blacklist);

      const result = await service.isBlocked(1, 2);

      expect(result).toBe(true);
      expect(blacklistRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 2, blockedUserId: 1 },
      });
    });

    it('应该返回false当用户未被拉黑', async () => {
      blacklistRepository.findOne.mockResolvedValue(null);

      const result = await service.isBlocked(1, 2);

      expect(result).toBe(false);
    });
  });

  describe('isFriend', () => {
    it('应该返回true当是好友', async () => {
      const friendship = {
        ...mockFriendship,
        status: FriendStatus.FRIEND,
      };
      friendshipRepository.findOne.mockResolvedValue(friendship);

      const result = await service.isFriend(1, 2);

      expect(result).toBe(true);
      expect(friendshipRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1, friendId: 2, status: FriendStatus.FRIEND },
      });
    });

    it('应该返回false当不是好友', async () => {
      friendshipRepository.findOne.mockResolvedValue(null);

      const result = await service.isFriend(1, 2);

      expect(result).toBe(false);
    });

    it('应该返回false当只是关注状态', async () => {
      friendshipRepository.findOne.mockResolvedValue(null);

      const result = await service.isFriend(1, 2);

      expect(result).toBe(false);
    });
  });

  describe('getFriendshipStatus', () => {
    it('应该返回好友状态', async () => {
      const friendship = {
        ...mockFriendship,
        status: FriendStatus.FRIEND,
        chatCount: 10,
      };
      friendshipRepository.findOne.mockResolvedValue(friendship);
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.getFriendshipStatus(1, 2);

      expect(result).toEqual({
        isFriend: true,
        isFollowing: true,
        canChat: true,
        chatCount: 10,
        requiredPoints: 50,
        currentPoints: 1000,
      });
    });

    it('应该返回关注状态但不能聊天（聊天次数不足）', async () => {
      const friendship = {
        ...mockFriendship,
        status: FriendStatus.FOLLOWING,
        chatCount: 5,
      };
      friendshipRepository.findOne.mockResolvedValue(friendship);
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.getFriendshipStatus(1, 2);

      expect(result).toEqual({
        isFriend: false,
        isFollowing: true,
        canChat: false,
        chatCount: 5,
        requiredPoints: 50,
        currentPoints: 1000,
      });
    });

    it('应该返回关注状态但不能聊天（积分不足）', async () => {
      const friendship = {
        ...mockFriendship,
        status: FriendStatus.FOLLOWING,
        chatCount: 8,
      };
      const poorUser = { ...mockUser, points: 30 };
      friendshipRepository.findOne.mockResolvedValue(friendship);
      userService.findById.mockResolvedValue(poorUser);

      const result = await service.getFriendshipStatus(1, 2);

      expect(result).toEqual({
        isFriend: false,
        isFollowing: true,
        canChat: false,
        chatCount: 8,
        requiredPoints: 50,
        currentPoints: 30,
      });
    });

    it('应该返回关注状态且可以聊天（满足条件）', async () => {
      const friendship = {
        ...mockFriendship,
        status: FriendStatus.FOLLOWING,
        chatCount: 8,
      };
      friendshipRepository.findOne.mockResolvedValue(friendship);
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.getFriendshipStatus(1, 2);

      expect(result).toEqual({
        isFriend: false,
        isFollowing: true,
        canChat: true,
        chatCount: 8,
        requiredPoints: 50,
        currentPoints: 1000,
      });
    });

    it('应该返回未关注状态', async () => {
      friendshipRepository.findOne.mockResolvedValue(null);
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.getFriendshipStatus(1, 2);

      expect(result).toEqual({
        isFriend: false,
        isFollowing: false,
        canChat: false,
        chatCount: 0,
        requiredPoints: 50,
        currentPoints: 1000,
      });
    });
  });

  describe('updateChatCount', () => {
    it('应该成功更新聊天次数', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: 5,
      };
      friendshipRepository.findOne.mockResolvedValue(friendship);
      friendshipRepository.save.mockResolvedValue({ ...friendship, chatCount: 6 });

      await service.updateChatCount(1, 2);

      expect(friendshipRepository.save).toHaveBeenCalledWith({
        ...friendship,
        chatCount: 6,
      });
    });

    it('应该处理聊天次数为0的情况', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: 0,
      };
      friendshipRepository.findOne.mockResolvedValue(friendship);
      friendshipRepository.save.mockResolvedValue({ ...friendship, chatCount: 1 });

      await service.updateChatCount(1, 2);

      expect(friendshipRepository.save).toHaveBeenCalledWith({
        ...friendship,
        chatCount: 1,
      });
    });

    it('应该处理聊天次数为null的情况', async () => {
      const friendship = {
        ...mockFriendship,
        chatCount: null,
      };
      friendshipRepository.findOne.mockResolvedValue(friendship);
      friendshipRepository.save.mockResolvedValue({ ...friendship, chatCount: 1 });

      await service.updateChatCount(1, 2);

      expect(friendshipRepository.save).toHaveBeenCalledWith({
        ...friendship,
        chatCount: 1,
      });
    });

    it('应该在关系不存在时不执行任何操作', async () => {
      friendshipRepository.findOne.mockResolvedValue(null);

      await service.updateChatCount(1, 2);

      expect(friendshipRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('blockUser - 额外场景', () => {
    it('应该成功拉黑用户（不提供原因）', async () => {
      const blacklist = {
        id: 1,
        userId: 1,
        blockedUserId: 2,
        reason: undefined,
      };
      blacklistRepository.findOne.mockResolvedValue(null);
      blacklistRepository.create.mockReturnValue(blacklist);
      blacklistRepository.save.mockResolvedValue(blacklist);

      const result = await service.blockUser(1, 2);

      expect(result).toEqual(blacklist);
      expect(blacklistRepository.create).toHaveBeenCalledWith({
        userId: 1,
        blockedUserId: 2,
        reason: undefined,
      });
    });
  });

  describe('getFollowingList - 额外场景', () => {
    it('应该返回空数组当没有关注', async () => {
      friendshipRepository.find.mockResolvedValue([]);

      const result = await service.getFollowingList(1);

      expect(result).toEqual([]);
    });

    it('应该返回包含不同状态的关注列表', async () => {
      const friendships = [
        { ...mockFriendship, status: FriendStatus.FOLLOWING },
        { ...mockFriendship, id: 2, friendId: 3, status: FriendStatus.FRIEND, friend: { ...mockFriend, id: 3 } },
      ];
      friendshipRepository.find.mockResolvedValue(friendships);

      const result = await service.getFollowingList(1);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(FriendStatus.FOLLOWING);
      expect(result[1].status).toBe(FriendStatus.FRIEND);
    });
  });
});
