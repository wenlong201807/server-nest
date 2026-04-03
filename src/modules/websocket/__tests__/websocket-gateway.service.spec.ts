import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketGatewayService } from '../websocket-gateway.service';
import { ChatGateway } from '../chat.gateway';

describe('WebSocketGatewayService', () => {
  let service: WebSocketGatewayService;
  let mockGateway: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebSocketGatewayService],
    }).compile();

    service = module.get<WebSocketGatewayService>(WebSocketGatewayService);

    mockGateway = {
      sendMessage: jest.fn(),
      server: {
        clients: new Set(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setGateway', () => {
    it('应该设置gateway实例', () => {
      service.setGateway(mockGateway as ChatGateway);

      // 验证gateway已设置，通过调用sendMessage来确认
      service.sendMessage(1, { type: 'test' });
      expect(mockGateway.sendMessage).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('应该通过gateway发送消息给指定用户', () => {
      service.setGateway(mockGateway as ChatGateway);

      const userId = 1;
      const message = { type: 'chat', content: 'Hello' };

      service.sendMessage(userId, message);

      expect(mockGateway.sendMessage).toHaveBeenCalledWith(userId, message);
    });

    it('应该处理gateway未初始化的情况', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const userId = 1;
      const message = { type: 'chat', content: 'Hello' };

      service.sendMessage(userId, message);

      expect(consoleSpy).toHaveBeenCalledWith('Gateway not initialized');
      consoleSpy.mockRestore();
    });

    it('应该支持发送不同类型的消息', () => {
      service.setGateway(mockGateway as ChatGateway);

      const textMessage = { type: 'text', content: 'Hello' };
      const imageMessage = { type: 'image', url: 'http://example.com/image.jpg' };
      const systemMessage = { type: 'system', content: 'User joined' };

      service.sendMessage(1, textMessage);
      service.sendMessage(2, imageMessage);
      service.sendMessage(3, systemMessage);

      expect(mockGateway.sendMessage).toHaveBeenCalledTimes(3);
      expect(mockGateway.sendMessage).toHaveBeenCalledWith(1, textMessage);
      expect(mockGateway.sendMessage).toHaveBeenCalledWith(2, imageMessage);
      expect(mockGateway.sendMessage).toHaveBeenCalledWith(3, systemMessage);
    });
  });

  describe('broadcastMessage', () => {
    it('应该广播消息给所有连接的客户端', () => {
      const mockClient1 = {
        send: jest.fn(),
      };

      const mockClient2 = {
        send: jest.fn(),
      };

      const mockClient3 = {
        send: jest.fn(),
      };

      mockGateway.server.clients = new Set([mockClient1, mockClient2, mockClient3]);
      service.setGateway(mockGateway as ChatGateway);

      const message = { type: 'broadcast', content: 'Hello everyone' };
      service.broadcastMessage(message);

      expect(mockClient1.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockClient2.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockClient3.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('应该处理没有连接客户端的情况', () => {
      mockGateway.server.clients = new Set();
      service.setGateway(mockGateway as ChatGateway);

      const message = { type: 'broadcast', content: 'Hello everyone' };

      expect(() => service.broadcastMessage(message)).not.toThrow();
    });

    it('应该处理gateway未初始化的情况', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const message = { type: 'broadcast', content: 'Hello everyone' };
      service.broadcastMessage(message);

      expect(consoleSpy).toHaveBeenCalledWith('Gateway not initialized');
      consoleSpy.mockRestore();
    });

    it('应该处理单个客户端发送失败的情况', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockClient1 = {
        send: jest.fn(),
      };

      const mockClient2 = {
        send: jest.fn().mockImplementation(() => {
          throw new Error('Send failed');
        }),
      };

      const mockClient3 = {
        send: jest.fn(),
      };

      mockGateway.server.clients = new Set([mockClient1, mockClient2, mockClient3]);
      service.setGateway(mockGateway as ChatGateway);

      const message = { type: 'broadcast', content: 'Hello everyone' };
      service.broadcastMessage(message);

      expect(mockClient1.send).toHaveBeenCalled();
      expect(mockClient3.send).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Broadcast error:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('应该正确序列化复杂消息对象', () => {
      const mockClient = {
        send: jest.fn(),
      };

      mockGateway.server.clients = new Set([mockClient]);
      service.setGateway(mockGateway as ChatGateway);

      const complexMessage = {
        type: 'notification',
        data: {
          id: 123,
          title: 'New Message',
          body: 'You have a new message',
          timestamp: new Date('2024-01-01'),
          metadata: {
            priority: 'high',
            tags: ['urgent', 'important'],
          },
        },
      };

      service.broadcastMessage(complexMessage);

      expect(mockClient.send).toHaveBeenCalledWith(JSON.stringify(complexMessage));
    });
  });

  describe('集成测试', () => {
    it('应该支持设置gateway后立即使用', () => {
      service.setGateway(mockGateway as ChatGateway);

      service.sendMessage(1, { type: 'test1' });
      service.broadcastMessage({ type: 'test2' });

      expect(mockGateway.sendMessage).toHaveBeenCalledWith(1, { type: 'test1' });
    });

    it('应该支持多次调用sendMessage', () => {
      service.setGateway(mockGateway as ChatGateway);

      for (let i = 1; i <= 10; i++) {
        service.sendMessage(i, { type: 'message', id: i });
      }

      expect(mockGateway.sendMessage).toHaveBeenCalledTimes(10);
    });
  });
});
