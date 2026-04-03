import { Test, TestingModule } from '@nestjs/testing';
import { FriendController } from '../friend.controller';
import { FriendService } from '../friend.service';

describe('FriendController', () => {
  let controller: FriendController;
  let friendService: any;

  beforeEach(async () => {
    friendService = {
      getFriendList: jest.fn(),
      getFollowingList: jest.fn(),
      getFriendshipStatus: jest.fn(),
      follow: jest.fn(),
      unlockChat: jest.fn(),
      deleteFriend: jest.fn(),
      blockUser: jest.fn(),
      getBlocklist: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendController],
      providers: [
        {
          provide: FriendService,
          useValue: friendService,
        },
      ],
    }).compile();

    controller = module.get<FriendController>(FriendController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFriendList', () => {
    it('应该调用 friendService.getFriendList', async () => {
      const userId = 1;
      const mockResult = [
        { id: 2, nickname: 'Friend1' },
        { id: 3, nickname: 'Friend2' },
      ];
      friendService.getFriendList.mockResolvedValue(mockResult);

      const result = await controller.getFriendList(userId);

      expect(result).toEqual(mockResult);
      expect(friendService.getFriendList).toHaveBeenCalledWith(userId);
    });
  });

  describe('getFollowingList', () => {
    it('应该调用 friendService.getFollowingList', async () => {
      const userId = 1;
      const mockResult = [
        { id: 2, nickname: 'Following1' },
        { id: 3, nickname: 'Following2' },
      ];
      friendService.getFollowingList.mockResolvedValue(mockResult);

      const result = await controller.getFollowingList(userId);

      expect(result).toEqual(mockResult);
      expect(friendService.getFollowingList).toHaveBeenCalledWith(userId);
    });
  });

  describe('getFriendshipStatus', () => {
    it('应该调用 friendService.getFriendshipStatus', async () => {
      const userId = 1;
      const targetId = 2;
      const mockResult = {
        isFriend: true,
        isFollowing: true,
        isBlocked: false,
      };
      friendService.getFriendshipStatus.mockResolvedValue(mockResult);

      const result = await controller.getFriendshipStatus(userId, targetId);

      expect(result).toEqual(mockResult);
      expect(friendService.getFriendshipStatus).toHaveBeenCalledWith(userId, targetId);
    });
  });

  describe('follow', () => {
    it('应该调用 friendService.follow', async () => {
      const userId = 1;
      const targetId = 2;
      const mockResult = { message: '关注成功' };
      friendService.follow.mockResolvedValue(mockResult);

      const result = await controller.follow(userId, targetId);

      expect(result).toEqual(mockResult);
      expect(friendService.follow).toHaveBeenCalledWith(userId, targetId);
    });
  });

  describe('unlockChat', () => {
    it('应该调用 friendService.unlockChat', async () => {
      const userId = 1;
      const targetId = 2;
      const mockResult = { message: '解锁私聊成功' };
      friendService.unlockChat.mockResolvedValue(mockResult);

      const result = await controller.unlockChat(userId, targetId);

      expect(result).toEqual(mockResult);
      expect(friendService.unlockChat).toHaveBeenCalledWith(userId, targetId);
    });
  });

  describe('deleteFriend', () => {
    it('应该调用 friendService.deleteFriend', async () => {
      const userId = 1;
      const targetId = 2;
      const mockResult = { message: '删除好友成功' };
      friendService.deleteFriend.mockResolvedValue(mockResult);

      const result = await controller.deleteFriend(userId, targetId);

      expect(result).toEqual(mockResult);
      expect(friendService.deleteFriend).toHaveBeenCalledWith(userId, targetId);
    });
  });

  describe('blockUser', () => {
    it('应该调用 friendService.blockUser 不带原因', async () => {
      const userId = 1;
      const targetId = 2;
      const mockResult = { message: '拉黑成功' };
      friendService.blockUser.mockResolvedValue(mockResult);

      const result = await controller.blockUser(userId, targetId);

      expect(result).toEqual(mockResult);
      expect(friendService.blockUser).toHaveBeenCalledWith(userId, targetId, undefined);
    });

    it('应该调用 friendService.blockUser 带原因', async () => {
      const userId = 1;
      const targetId = 2;
      const reason = '骚扰';
      const mockResult = { message: '拉黑成功' };
      friendService.blockUser.mockResolvedValue(mockResult);

      const result = await controller.blockUser(userId, targetId, reason);

      expect(result).toEqual(mockResult);
      expect(friendService.blockUser).toHaveBeenCalledWith(userId, targetId, reason);
    });
  });

  describe('getBlocklist', () => {
    it('应该调用 friendService.getBlocklist', async () => {
      const userId = 1;
      const mockResult = [
        { id: 2, nickname: 'Blocked1', reason: '骚扰' },
        { id: 3, nickname: 'Blocked2' },
      ];
      friendService.getBlocklist.mockResolvedValue(mockResult);

      const result = await controller.getBlocklist(userId);

      expect(result).toEqual(mockResult);
      expect(friendService.getBlocklist).toHaveBeenCalledWith(userId);
    });
  });
});
