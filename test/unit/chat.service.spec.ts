import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '../../src/modules/chat/chat.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatMessage } from '../../src/modules/chat/entities/message.entity';
import { Repository } from 'typeorm';
import { UserService } from '../../src/modules/user/user.service';
import { FriendService } from '../../src/modules/friend/friend.service';
import { WebSocketGatewayService } from '../../src/modules/websocket/websocket-gateway.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MsgType } from '../../src/common/constants';

describe('ChatService (Unit)', () => {
  let service: ChatService;
  let messageRepository: Repository<ChatMessage>;
  let userService: UserService;
  let friendService: FriendService;
  let wsGateway: WebSocketGatewayService;

  const mockMessage: ChatMessage = {
    id: 1,
    senderId: 1,
    receiverId: 2,
    content: '测试消息',
    msgType: MsgType.TEXT,
    isRead: false,
    createdAt: new Date(),
  };

  const mockUser = {
    id: 2,
    mobile: '13800000002',
    nickname: '接收者',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  const mockMessageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserService = {
    findById: jest.fn(),
  };

  const mockFriendService = {
    isFriend: jest.fn(),
    isBlocked: jest.fn(),
    updateChatCount: jest.fn(),
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
    messageRepository = module.get<Repository<ChatMessage>>(
      getRepositoryToken(ChatMessage),
    );
    userService = module.get<UserService>(UserService);
    friendService = module.get<FriendService>(FriendService);
    wsGateway = module.get<WebSocketGatewayService>(WebSocketGatewayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    const sendMessageDto = {
      receiverId: 2,
      content: '你好',
      msgType: MsgType.TEXT,
    };

    it('should send a message successfully', async () => {
      mockFriendService.isFriend.mockResolvedValue(true);
      mockFriendService.isBlocked.mockResolvedValue(false);
      mockMessageRepository.create.mockReturnValue(mockMessage);
      mockMessageRepository.save.mockResolvedValue(mockMessage);

      const result = await service.sendMessage(1, sendMessageDto);

      expect(result).toEqual({
        id: mockMessage.id,
        createdAt: mockMessage.createdAt,
      });
      expect(mockFriendService.isFriend).toHaveBeenCalledWith(1, 2);
      expect(mockFriendService.isBlocked).toHaveBeenCalledWith(1, 2);
      expect(mockMessageRepository.save).toHaveBeenCalled();
      expect(mockFriendService.updateChatCount).toHaveBeenCalledTimes(2);
      expect(mockWsGateway.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when not friends', async () => {
      mockFriendService.isFriend.mockResolvedValue(false);

      await expect(service.sendMessage(1, sendMessageDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.sendMessage(1, sendMessageDto)).rejects.toThrow(
        '请先解锁私聊',
      );
    });

    it('should throw BadRequestException when blocked', async () => {
      mockFriendService.isFriend.mockResolvedValue(true);
      mockFriendService.isBlocked.mockResolvedValue(true);

      await expect(service.sendMessage(1, sendMessageDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.sendMessage(1, sendMessageDto)).rejects.toThrow(
        '对方已拉黑你',
      );
    });

    it('should send message with default TEXT type when msgType not provided', async () => {
      const dtoWithoutType = {
        receiverId: 2,
        content: '你好',
      };

      mockFriendService.isFriend.mockResolvedValue(true);
      mockFriendService.isBlocked.mockResolvedValue(false);
      mockMessageRepository.create.mockReturnValue(mockMessage);
      mockMessageRepository.save.mockResolvedValue(mockMessage);

      await service.sendMessage(1, dtoWithoutType as any);

      expect(mockMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          msgType: MsgType.TEXT,
        }),
      );
    });
  });

  describe('getHistory', () => {
    it('should return chat history with pagination', async () => {
      const messages = [
        { ...mockMessage, id: 1, createdAt: new Date('2024-01-01') },
        { ...mockMessage, id: 2, createdAt: new Date('2024-01-02') },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([messages, 2]),
      };

      mockMessageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getHistory(1, 2, 1, 50);

      expect(result).toEqual({
        data: messages.map((msg) => ({ ...msg, isSelf: msg.senderId === 1 })),
        total: 2,
        page: 1,
        pageSize: 50,
        hasMore: false,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'msg.createdAt',
        'DESC',
      );
    });

    it('should support beforeId for cursor-based pagination', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockMessageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await service.getHistory(1, 2, 1, 50, 100);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'msg.id < :beforeId',
        { beforeId: 100 },
      );
    });

    it('should mark messages with isSelf flag correctly', async () => {
      const messages = [
        { ...mockMessage, id: 1, senderId: 1, receiverId: 2 },
        { ...mockMessage, id: 2, senderId: 2, receiverId: 1 },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([messages, 2]),
      };

      mockMessageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getHistory(1, 2, 1, 50);

      expect(result.data[0].isSelf).toBe(true);
      expect(result.data[1].isSelf).toBe(false);
    });
  });

  describe('getConversations', () => {
    it('should return conversations list with unread counts', async () => {
      const messages = [
        { ...mockMessage, id: 1, senderId: 2, receiverId: 1 },
        { ...mockMessage, id: 2, senderId: 1, receiverId: 2 },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(messages),
      };

      mockMessageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockUserService.findById.mockResolvedValue(mockUser);
      mockMessageRepository.count.mockResolvedValue(3);

      const result = await service.getConversations(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: 2,
        nickname: mockUser.nickname,
        avatarUrl: mockUser.avatarUrl,
        lastMessage: messages[0].content,
        lastTime: messages[0].createdAt,
        unreadCount: 3,
      });
    });

    it('should return empty array when no conversations', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockMessageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getConversations(1);

      expect(result).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
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

    it('should only mark unread messages from specific sender', async () => {
      mockMessageRepository.update.mockResolvedValue({ affected: 0 });

      await service.markAsRead(1, 2);

      expect(mockMessageRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          senderId: 2,
          receiverId: 1,
          isRead: false,
        }),
        { isRead: true },
      );
    });
  });
});
