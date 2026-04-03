import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '../chat.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatMessage } from '../entities/message.entity';
import { UserService } from '../../user/user.service';
import { FriendService } from '../../friend/friend.service';
import { WebSocketGatewayService } from '../../websocket/websocket-gateway.service';
import { BadRequestException } from '@nestjs/common';
import { MsgType } from '@common/constants';

describe('ChatService', () => {
  let service: ChatService;
  let messageRepository: any;
  let userService: any;
  let friendService: any;
  let wsGateway: any;

  const mockUser = {
    id: 1,
    mobile: '13800138000',
    nickname: 'User 1',
    avatarUrl: 'avatar1.jpg',
  };

  const mockTargetUser = {
    id: 2,
    mobile: '13800138001',
    nickname: 'User 2',
    avatarUrl: 'avatar2.jpg',
  };

  const mockMessage = {
    id: 1,
    senderId: 1,
    receiverId: 2,
    content: '你好',
    msgType: MsgType.TEXT,
    isRead: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    messageRepository = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getManyAndCount: jest.fn(),
      })),
    };

    userService = {
      findById: jest.fn(),
    };

    friendService = {
      isFriend: jest.fn(),
      isBlocked: jest.fn(),
      updateChatCount: jest.fn(),
    };

    wsGateway = {
      sendMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: messageRepository,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: FriendService,
          useValue: friendService,
        },
        {
          provide: WebSocketGatewayService,
          useValue: wsGateway,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('应该成功发送消息', async () => {
      friendService.isFriend.mockResolvedValue(true);
      friendService.isBlocked.mockResolvedValue(false);
      messageRepository.create.mockReturnValue(mockMessage);
      messageRepository.save.mockResolvedValue(mockMessage);
      friendService.updateChatCount.mockResolvedValue(undefined);
      wsGateway.sendMessage.mockReturnValue(undefined);

      const result = await service.sendMessage(1, {
        receiverId: 2,
        content: '你好',
        msgType: MsgType.TEXT,
      });

      expect(result).toEqual({
        id: mockMessage.id,
        createdAt: mockMessage.createdAt,
      });
      expect(messageRepository.create).toHaveBeenCalledWith({
        senderId: 1,
        receiverId: 2,
        content: '你好',
        msgType: MsgType.TEXT,
      });
      expect(friendService.updateChatCount).toHaveBeenCalledTimes(2);
      expect(wsGateway.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('应该拒绝非好友发送消息', async () => {
      friendService.isFriend.mockResolvedValue(false);

      await expect(
        service.sendMessage(1, {
          receiverId: 2,
          content: '你好',
          msgType: MsgType.TEXT,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.sendMessage(1, {
          receiverId: 2,
          content: '你好',
          msgType: MsgType.TEXT,
        }),
      ).rejects.toThrow('请先解锁私聊');
    });

    it('应该拒绝被拉黑用户发送消息', async () => {
      friendService.isFriend.mockResolvedValue(true);
      friendService.isBlocked.mockResolvedValue(true);

      await expect(
        service.sendMessage(1, {
          receiverId: 2,
          content: '你好',
          msgType: MsgType.TEXT,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.sendMessage(1, {
          receiverId: 2,
          content: '你好',
          msgType: MsgType.TEXT,
        }),
      ).rejects.toThrow('对方已拉黑你');
    });

    it('应该支持图片消息类型', async () => {
      friendService.isFriend.mockResolvedValue(true);
      friendService.isBlocked.mockResolvedValue(false);
      const imageMessage = { ...mockMessage, msgType: MsgType.IMAGE };
      messageRepository.create.mockReturnValue(imageMessage);
      messageRepository.save.mockResolvedValue(imageMessage);
      friendService.updateChatCount.mockResolvedValue(undefined);
      wsGateway.sendMessage.mockReturnValue(undefined);

      await service.sendMessage(1, {
        receiverId: 2,
        content: 'http://example.com/image.jpg',
        msgType: MsgType.IMAGE,
      });

      expect(messageRepository.create).toHaveBeenCalledWith({
        senderId: 1,
        receiverId: 2,
        content: 'http://example.com/image.jpg',
        msgType: MsgType.IMAGE,
      });
    });

    it('应该支持表情消息类型', async () => {
      friendService.isFriend.mockResolvedValue(true);
      friendService.isBlocked.mockResolvedValue(false);
      const emojiMessage = { ...mockMessage, msgType: MsgType.EMOJI };
      messageRepository.create.mockReturnValue(emojiMessage);
      messageRepository.save.mockResolvedValue(emojiMessage);
      friendService.updateChatCount.mockResolvedValue(undefined);
      wsGateway.sendMessage.mockReturnValue(undefined);

      await service.sendMessage(1, {
        receiverId: 2,
        content: '😊',
        msgType: MsgType.EMOJI,
      });

      expect(messageRepository.create).toHaveBeenCalledWith({
        senderId: 1,
        receiverId: 2,
        content: '😊',
        msgType: MsgType.EMOJI,
      });
    });

    it('应该使用默认消息类型当未提供时', async () => {
      friendService.isFriend.mockResolvedValue(true);
      friendService.isBlocked.mockResolvedValue(false);
      messageRepository.create.mockReturnValue(mockMessage);
      messageRepository.save.mockResolvedValue(mockMessage);
      friendService.updateChatCount.mockResolvedValue(undefined);
      wsGateway.sendMessage.mockReturnValue(undefined);

      await service.sendMessage(1, {
        receiverId: 2,
        content: '你好',
      } as any);

      expect(messageRepository.create).toHaveBeenCalledWith({
        senderId: 1,
        receiverId: 2,
        content: '你好',
        msgType: MsgType.TEXT,
      });
    });

    it('应该正确推送消息给接收者和发送者', async () => {
      friendService.isFriend.mockResolvedValue(true);
      friendService.isBlocked.mockResolvedValue(false);
      messageRepository.create.mockReturnValue(mockMessage);
      messageRepository.save.mockResolvedValue(mockMessage);
      friendService.updateChatCount.mockResolvedValue(undefined);
      wsGateway.sendMessage.mockReturnValue(undefined);

      await service.sendMessage(1, {
        receiverId: 2,
        content: '你好',
        msgType: MsgType.TEXT,
      });

      expect(wsGateway.sendMessage).toHaveBeenNthCalledWith(1, 2, {
        type: 'message',
        data: expect.objectContaining({
          isSelf: false,
          isRead: false,
        }),
      });

      expect(wsGateway.sendMessage).toHaveBeenNthCalledWith(2, 1, {
        type: 'message',
        data: expect.objectContaining({
          isSelf: true,
          isRead: true,
        }),
      });
    });
  });

  describe('getHistory', () => {
    it('应该返回聊天历史', async () => {
      const messages = [
        { ...mockMessage, id: 1 },
        { ...mockMessage, id: 2 },
      ];
      messageRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([messages, 2]),
      });

      const result = await service.getHistory(1, 2, 1, 50);

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.hasMore).toBe(false);
    });

    it('应该使用默认参数值当未提供 page 和 pageSize', async () => {
      const messages = [{ ...mockMessage, id: 1 }];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([messages, 1]),
      };
      messageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getHistory(1, 2);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it('应该不调用 andWhere 当 beforeId 未提供', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      messageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getHistory(1, 2, 1, 50);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('应该支持分页', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      messageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getHistory(1, 2, 2, 20);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('应该支持 beforeId 参数', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      messageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getHistory(1, 2, 1, 50, 100);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('msg.id < :beforeId', {
        beforeId: 100,
      });
    });

    it('应该正确标记 isSelf', async () => {
      const messages = [
        { ...mockMessage, id: 2, senderId: 2, receiverId: 1 },
        { ...mockMessage, id: 1, senderId: 1, receiverId: 2 },
      ];
      messageRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([messages, 2]),
      });

      const result = await service.getHistory(1, 2, 1, 50);

      expect(result.data[0].isSelf).toBe(true);
      expect(result.data[1].isSelf).toBe(false);
    });
  });

  describe('getConversations', () => {
    it('应该返回会话列表', async () => {
      const messages = [
        { ...mockMessage, senderId: 1, receiverId: 2 },
        { ...mockMessage, senderId: 2, receiverId: 1 },
      ];
      messageRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(messages),
      });
      userService.findById.mockResolvedValue(mockTargetUser);
      messageRepository.count.mockResolvedValue(3);

      const result = await service.getConversations(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: 2,
        nickname: 'User 2',
        avatarUrl: 'avatar2.jpg',
        lastMessage: mockMessage.content,
        lastTime: mockMessage.createdAt,
        unreadCount: 3,
      });
    });

    it('应该处理多个会话', async () => {
      const messages = [
        { ...mockMessage, senderId: 1, receiverId: 2 },
        { ...mockMessage, senderId: 1, receiverId: 3 },
        { ...mockMessage, senderId: 2, receiverId: 1 },
      ];
      messageRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(messages),
      });
      userService.findById
        .mockResolvedValueOnce(mockTargetUser)
        .mockResolvedValueOnce({ ...mockTargetUser, id: 3, nickname: 'User 3' });
      messageRepository.count.mockResolvedValue(0);

      const result = await service.getConversations(1);

      expect(result).toHaveLength(2);
    });

    it('应该返回空数组当没有会话', async () => {
      messageRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getConversations(1);

      expect(result).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('应该标记消息为已读', async () => {
      messageRepository.update.mockResolvedValue({ affected: 5 });

      await service.markAsRead(1, 2);

      expect(messageRepository.update).toHaveBeenCalledWith(
        {
          senderId: 2,
          receiverId: 1,
          isRead: false,
        },
        { isRead: true },
      );
    });

    it('应该处理没有未读消息的情况', async () => {
      messageRepository.update.mockResolvedValue({ affected: 0 });

      await service.markAsRead(1, 2);

      expect(messageRepository.update).toHaveBeenCalled();
    });
  });

  describe('边界测试', () => {
    it('应该处理长消息内容', async () => {
      const longContent = 'a'.repeat(1000);
      friendService.isFriend.mockResolvedValue(true);
      friendService.isBlocked.mockResolvedValue(false);
      const longMessage = { ...mockMessage, content: longContent };
      messageRepository.create.mockReturnValue(longMessage);
      messageRepository.save.mockResolvedValue(longMessage);
      friendService.updateChatCount.mockResolvedValue(undefined);
      wsGateway.sendMessage.mockReturnValue(undefined);

      await service.sendMessage(1, {
        receiverId: 2,
        content: longContent,
        msgType: MsgType.TEXT,
      });

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: longContent,
        }),
      );
    });

    it('应该处理大量历史消息', async () => {
      const largeMessages = Array.from({ length: 100 }, (_, i) => ({
        ...mockMessage,
        id: i + 1,
      }));
      messageRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([largeMessages, 100]),
      });

      const result = await service.getHistory(1, 2, 1, 100);

      expect(result.total).toBe(100);
    });
  });
});
