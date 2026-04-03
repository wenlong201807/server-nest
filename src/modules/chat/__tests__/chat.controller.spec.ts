import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../chat.controller';
import { ChatService } from '../chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: any;

  beforeEach(async () => {
    chatService = {
      sendMessage: jest.fn(),
      getHistory: jest.fn(),
      getConversations: jest.fn(),
      markAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: chatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('应该调用 chatService.sendMessage 并传递正确的参数', async () => {
      const userId = 1;
      const dto = {
        receiverId: 2,
        content: 'Hello',
        msgType: undefined,
      };
      const mockResult = {
        id: 1,
        senderId: userId,
        receiverId: dto.receiverId,
        content: dto.content,
      };
      chatService.sendMessage.mockResolvedValue(mockResult);

      const result = await controller.sendMessage(userId, dto);

      expect(result).toEqual(mockResult);
      expect(chatService.sendMessage).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('getHistory', () => {
    it('应该调用 chatService.getHistory 并传递默认分页参数', async () => {
      const userId = 1;
      const targetId = 2;
      const mockResult = {
        data: [],
        total: 0,
      };
      chatService.getHistory.mockResolvedValue(mockResult);

      const result = await controller.getHistory(userId, targetId);

      expect(result).toEqual(mockResult);
      expect(chatService.getHistory).toHaveBeenCalledWith(userId, targetId, 1, 50, undefined);
    });

    it('应该调用 chatService.getHistory 并传递自定义分页参数', async () => {
      const userId = 1;
      const targetId = 2;
      const page = 2;
      const pageSize = 20;
      const beforeId = 100;
      const mockResult = {
        data: [],
        total: 0,
      };
      chatService.getHistory.mockResolvedValue(mockResult);

      const result = await controller.getHistory(userId, targetId, page, pageSize, beforeId);

      expect(result).toEqual(mockResult);
      expect(chatService.getHistory).toHaveBeenCalledWith(userId, targetId, page, pageSize, beforeId);
    });
  });

  describe('getConversations', () => {
    it('应该调用 chatService.getConversations', async () => {
      const userId = 1;
      const mockResult = [
        {
          userId: 2,
          lastMessage: 'Hello',
          unreadCount: 5,
        },
      ];
      chatService.getConversations.mockResolvedValue(mockResult);

      const result = await controller.getConversations(userId);

      expect(result).toEqual(mockResult);
      expect(chatService.getConversations).toHaveBeenCalledWith(userId);
    });
  });

  describe('markAsRead', () => {
    it('应该调用 chatService.markAsRead', async () => {
      const userId = 1;
      const targetId = 2;
      const mockResult = { success: true };
      chatService.markAsRead.mockResolvedValue(mockResult);

      const result = await controller.markAsRead(userId, targetId);

      expect(result).toEqual(mockResult);
      expect(chatService.markAsRead).toHaveBeenCalledWith(userId, targetId);
    });
  });
});
