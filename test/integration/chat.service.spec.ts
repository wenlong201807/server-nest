import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '../../src/modules/chat/chat.service';
import { UserService } from '../../src/modules/user/user.service';
import { FriendService } from '../../src/modules/friend/friend.service';
import { WebSocketGatewayService } from '../../src/modules/websocket/websocket-gateway.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatMessage } from '../../src/modules/chat/entities/message.entity';
import { BadRequestException } from '@nestjs/common';
import { MsgType } from '../../src/common/constants';

describe('ChatService (Integration)', () => {
  let service: ChatService;
  let userService: UserService;
  let friendService: FriendService;
  let wsGateway: WebSocketGatewayService;

  const mockUser1 = {
    id: 1,
    mobile: '13800000001',
    nickname: '用户1',
    avatarUrl: 'https://example.com/avatar1.jpg',
  };

  const mockUser2 = {
    id: 2,
    mobile: '13800000002',
    nickname: '用户2',
    avatarUrl: 'https://example.com/avatar2.jpg',
  };

  const mockMessageRepository = {
    create: jest.fn((dto) => ({
      id: Math.floor(Math.random() * 1000),
      ...dto,
      isRead: false,
      createdAt: new Date(),
    })),
    save: jest.fn((msg) => Promise.resolve(msg)),
    update: jest.fn(() => Promise.resolve({ affected: 1 })),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockUserService = {
    findById: jest.fn((id) => {
      if (id === 1) return Promise.resolve(mockUser1);
      if (id === 2) return Promise.resolve(mockUser2);
      return Promise.resolve(null);
    }),
  };

  const mockFriendService = {
    isFriend: jest.fn(),
    isBlocked: jest.fn(),
    updateChatCount: jest.fn(() => Promise.resolve()),
  };

  const mockWsGateway = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: mockMessageRepository,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: FriendService,
          useValue: mockFriendService,
        },
        {
          provide: WebSocketGatewayService,
          useValue: mockWsGateway,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    userService = module.get<UserService>(UserService);
    friendService = module.get<FriendService>(FriendService);
    wsGateway = module.get<WebSocketGatewayService>(WebSocketGatewayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage workflow', () => {
    it('should complete full message sending workflow', async () => {
      const sendMessageDto = {
        receiverId: 2,
        content: '你好，这是一条测试消息',
        msgType: MsgType.TEXT,
      };

      mockFriendService.isFriend.mockResolvedValue(true);
      mockFriendService.isBlocked.mockResolvedValue(false);

      const result = await service.sendMessage(1, sendMessageDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');

      // Verify friendship check
      expect(mockFriendService.isFriend).toHaveBeenCalledWith(1, 2);

      // Verify block check
      expect(mockFriendService.isBlocked).toHaveBeenCalledWith(1, 2);

      // Verify message saved
      expect(mockMessageRepository.save).toHaveBeenCalled();

      // Verify chat count updated for both users
      expect(mockFriendService.updateChatCount).toHaveBeenCalledWith(1, 2);
      expect(mockFriendService.updateChatCount).toHaveBeenCalledWith(2, 1);

      // Verify WebSocket messages sent to both users
      expect(mockWsGateway.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockWsGateway.sendMessage).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          type: 'message',
          data: expect.objectContaining({
            senderId: 1,
            receiverId: 2,
            content: sendMessageDto.content,
            isSelf: false,

        }),
      );
      expect(mockWsGateway.sendMessage).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          type: 'message',
          data: expect.objectContaining({
            senderId: 1,
            receiverId: 2,
            content: sendMessageDto.content,
            isSelf: true,
          }),
        }),
      );
    });

    it('should handle image message type', async () => {
      const sendMessageDto = {
        receiverId: 2,
        content: 'https://example.com/image.jpg',
        msgType: MsgType.IMAGE,
      };

      mockFriendService.isFriend.mockResolvedValue(true);
      mockFriendService.isBlocked.mockResolvedValue(false);

      await service.sendMessage(1, sendMessageDto);

      expect(mockMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          msgType: MsgType.IMAGE,
        }),
      );
    });

    it('should prevent sending message to non-friend', async () => {
      const sendMessageDto = {
        receiverId: 3,
        content: '你好',
        msgType: MsgType.TEXT,
      };

      mockFriendService.isFriend.mockResolvedValue(false);

      await expect(service.sendMessage(1, sendMessageDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.sendMessage(1, sendMessageDto)).rejects.toThrow(
        '请先解锁私聊',
      );

      // Should not proceed to save message
      expect(mockMessageRepository.save).not.toHaveBeenCalled();
      expect(mockWsGateway.sendMessage).not.toHaveBeenCalled();
    });

    it('should prevent sending message when blocked', async () => {
      const sendMessageDto = {
        receiverId: 2,
        content: '你好',
        msgType: MsgType.TEXT,
      };

      mockFriendService.isFriend.mockResolvedValue(true);
      mockFriendService.isBlocked.mockResolvedValue(true);

      await expect(service.sendMessage(1, sendMessageDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.sendMessage(1, sendMessageDto)).rejects.toThrow(
        '对方已拉黑你',
      );

      expect(mockMessageRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getHistory with pagination', () => {
    it('should retrieve chat history between two users', async () => {
      const mockMessages = [
        {
          id: 1,
          senderId: 1,
          receiverId: 2,
          content: '消息1',
          msgType: MsgType.T,
          isRead: true,
          createdAt: new Date('2024-01-01T10:00:00'),
        },
        {
          id: 2,
          senderId: 2,
          receiverId: 1,
          content: '消息2',
          msgType: MsgType.TEXT,
          isRead: true,
          createdAt: new Date('2024-01-01T10:01:00'),
        },
        {
          id: 3,
          senderId: 1,
          receiverId: 2,
          content: '消息3',
          msgType: MsgType.TEXT,
          isRead: false,
          createdAt: new Date('2024-01-01T10:02:00'),
        },
      ];

      const mockQueryBuilder = mockMessageRepository.createQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockMessages, 3]);

      const result = await service.getHistory(1, 2, 1, 50);

      expect(result).toEqual({
        data: mockMessages.map((msg) => ({
          ...msg,
          isSelf: msg.senderId === 1,
        })),
        total: 3,
        page: 1,
        pageSize: 50,
        hasMore: false,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockMessages = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        senderId: i % 2 === 0 ? 1 : 2,
        receiverId: i % 2 === 0 ? 2 : 1,
     content: `消息${i + 1}`,
        msgType: MsgType.TEXT,
        isRead: true,
        createdAt: new Date(),
      }));

      const mockQueryBuilder = mockMessageRepository.createQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockMessages, 150]);

      const result = await service.getHistory(1, 2, 1, 50);

      expect(result.total).toBe(150);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.hasMore).toBe(true);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.BeenCalledWith(50);
    });

    it('should support cursor-based pagination with beforeId', async () => {
      const mockQueryBuilder = mockMessageRepository.createQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getHistory(1, 2, 1, 50, 100);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'msg.id < :beforeId',
        { beforeId: 100 },
      );
    });
  });

  describe('getConversations', () => {
    it('should return conversations with user info and unread counts', async () => {
      const mockMessages = [
        {
          id: 1,
          senderId: 2,
          receiverId: 1,
          content: '最新消息',
          msgType: MsgType.TEXT,
          isRead: false,
          createdAt: new Date('2024-01-01T12:00:00'),
        },
        {
          id: 2,
          senderId: 1,
          receiverId: 2,
          content: '之前的消息',
          msgType: MsgType.TEXT,
          isRead: true,
          createdAt: new Date('2024-01-01T11:00:00'),
        },
      ];

      const mockQueryBuilder = mockMessageRepository.createQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue(mockMessag    mockMessageRepository.count.mockResolvedValue(5);

      const result = await service.getConversations(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: 2,
        nickname: mockUser2.nickname,
        avatarUrl: mockUser2.avatarUrl,
        lastMessage: '最新消息',
        lastTime: mockMessages[0].createdAt,
        unreadCount: 5,
      });

      expect(mockUserService.findById).toHaveBeenCalledWith(2);
    });

    it('should handle multiple conversations', async () => {
      const mockMessages = [
        {
          id: 1,
          senderId: 2,
          receiverId: 1,
          content: '来自用户2',
          msgType: MsgType.TEXT,
          isRead: false,
          createdAt: new Date('2024-01-01T12:00:00'),
        },
        {
          id: 2,
          senderId: 3,
          receiverId: 1,
          content: '来自用户3',
          msgType: MsgType.TEXT,
          isRead: false,
          createdAt: new Date('2024-01-01T11:00:00'),
        },
      ];

      const mockUser3 = {
        id: 3,
        nickname: '用户3',
        avatarUrl: 'https://example.com/avatar3.jpg',
      };

      mockUserService.findById.mockImplementation((id) => {
        if (id === 2) return Promise.resolve(moer2);
        if (id === 3) return Promise.resolve(er3);
        return Promise.resolve(null);
      });

      const mockQueryBuilder = mockMessageRepository.createQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue(mockMessages);
      mockMessageRepository.count.mockResolvedValue(2);

      const result = await service.getConversations(1);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(2);
      expect(result[1].userId).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('should mark all unread messages from sender as read', async () => {
      mockMessageRepository.update.mockResolvedValue({ affected: 5 });

      await service.markAsRead(1, 2);

      expect(mockMessageRepository.update).toHaveBeenCalledWith(
        {
          senderId: 2,
          receiverId: 1,
          isRead: false,
        },
        { isRead: true },
      );
    });

    it('should handle case when no unread messages exist', async () => {
      mockMessageRepository.update.mockResolvedValue({ affected: 0 });

      await service.markAsRead(1, 2);

      expect(mockMessageRepository.update).toHaveBeenCalled();
    });
  });

  describe('integratiscenarios', () => {
    it('should handle complete chat flow: send, retrieve, mark as read', async () => {
      // Step 1: Send message
      mockFriendService.isFriend.mockResolvedValue(true);
      mockFriendService.isBlocked.mockResolvedValue(false);

      const sendResult = await service.sendMessage(1, {
        receiverId: 2,
        content: '测试消息',
        msgType: MsgType.TEXT,
      });

      expect(sendResult).toHaveProperty('id');

      // Step 2: Get history
      const mockMessages = [
        {
          id: sendResult.id,
          senderId: 1,
          receiverId: 2,
          content: '测试消息',
          msgType: MsgType.TEXT,
          isRead: false,
          createdAt: sendResult.createdAt,
        },
      ];

      const mockQueryBuilder = mockMessageRepository.createQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockMessages, 1]);

      const historyResult = await service.getHistory(1, 2, 1, 50);
      expect(historyResult.data).toHaveLength(1);

      // Step 3: Mark as read
      await service.markAsRead(2, 1);
      expect(mockMessageRepository.update).toHaveBeenCalled();
    });
  });
});
