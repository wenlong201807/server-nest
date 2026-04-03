import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from '../chat.gateway';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGatewayService } from '../websocket-gateway.service';
import { Server } from 'ws';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwtService: any;
  let wsService: any;

  const mockUserId = 1;
  const mockToken = 'valid.jwt.token';

  beforeEach(async () => {
    jwtService = {
      verify: jest.fn(),
    };

    wsService = {
      setGateway: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: WebSocketGatewayService,
          useValue: wsService,
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    gateway.server = {
      clients: new Set(),
    } as any as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('应该成功连接有效token的客户端', () => {
      const mockClient: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws?token=valid.jwt.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockReturnValue({ sub: mockUserId });

      gateway.handleConnection(mockClient, mockReq);

      expect(jwtService.verify).toHaveBeenCalledWith(mockToken);
      expect(mockClient.userId).toBe(mockUserId);
      expect(mockClient.close).not.toHaveBeenCalled();
      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'connected', data: { userId: mockUserId } }),
      );
      expect(mockClient.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('应该拒绝没有token的连接', () => {
      const mockClient: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws',
        headers: {
          host: 'localhost:3000',
        },
      };

      gateway.handleConnection(mockClient, mockReq);

      expect(mockClient.close).toHaveBeenCalled();
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('应该拒绝无效token的连接', () => {
      const mockClient: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws?token=invalid.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      gateway.handleConnection(mockClient, mockReq);

      expect(jwtService.verify).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('应该支持同一用户多个连接', () => {
      const mockClient1: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockClient2: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws?token=valid.jwt.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockReturnValue({ sub: mockUserId });

      gateway.handleConnection(mockClient1, mockReq);
      gateway.handleConnection(mockClient2, mockReq);

      expect(mockClient1.userId).toBe(mockUserId);
      expect(mockClient2.userId).toBe(mockUserId);
      expect(mockClient1.close).not.toHaveBeenCalled();
      expect(mockClient2.close).not.toHaveBeenCalled();
    });

    it('应该处理消息事件', () => {
      const mockClient: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws?token=valid.jwt.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockReturnValue({ sub: mockUserId });

      gateway.handleConnection(mockClient, mockReq);

      const messageHandler = mockClient.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )[1];

      const pingMessage = Buffer.from(JSON.stringify({ type: 'ping' }));
      messageHandler(pingMessage);

      expect(mockClient.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"pong"'),
      );
    });

    it('应该处理无效JSON消息', () => {
      const mockClient: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws?token=valid.jwt.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockReturnValue({ sub: mockUserId });

      gateway.handleConnection(mockClient, mockReq);

      const messageHandler = mockClient.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )[1];

      const invalidMessage = Buffer.from('invalid json');
      messageHandler(invalidMessage);

      // 不应该抛出错误，应该被捕获
      expect(mockClient.close).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('应该正确处理客户端断开连接', () => {
      const mockClient: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        userId: mockUserId,
      };

      const mockReq = {
        url: '/ws?token=valid.jwt.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockReturnValue({ sub: mockUserId });

      gateway.handleConnection(mockClient, mockReq);
      gateway.handleDisconnect(mockClient);

      // 验证用户已从映射中移除
      gateway.sendMessage(mockUserId, { type: 'test' });
      expect(mockClient.send).toHaveBeenCalledTimes(1); // 只有连接时的消息
    });

    it('应该处理多个连接中的一个断开', () => {
      const mockClient1: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockClient2: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws?token=valid.jwt.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockReturnValue({ sub: mockUserId });

      gateway.handleConnection(mockClient1, mockReq);
      gateway.handleConnection(mockClient2, mockReq);

      gateway.handleDisconnect(mockClient1);

      // 第二个连接应该仍然能收到消息
      gateway.sendMessage(mockUserId, { type: 'test' });
      expect(mockClient2.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'test' }),
      );
    });

    it('应该处理没有userId的客户端断开', () => {
      const mockClient: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      // 不应该抛出错误
      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('应该向在线用户发送消息', () => {
      const mockClient: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws?token=valid.jwt.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockReturnValue({ sub: mockUserId });

      gateway.handleConnection(mockClient, mockReq);

      const testMessage = { type: 'chat', content: 'Hello' };
      gateway.sendMessage(mockUserId, testMessage);

      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify(testMessage),
      );
    });

    it('应该向同一用户的所有连接发送消息', () => {
      const mockClient1: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockClient2: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws?token=valid.jwt.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockReturnValue({ sub: mockUserId });

      gateway.handleConnection(mockClient1, mockReq);
      gateway.handleConnection(mockClient2, mockReq);

      const testMessage = { type: 'chat', content: 'Hello' };
      gateway.sendMessage(mockUserId, testMessage);

      expect(mockClient1.send).toHaveBeenCalledWith(
        JSON.stringify(testMessage),
      );
      expect(mockClient2.send).toHaveBeenCalledWith(
        JSON.stringify(testMessage),
      );
    });

    it('应该处理离线用户', () => {
      const offlineUserId = 999;
      const testMessage = { type: 'chat', content: 'Hello' };

      // 不应该抛出错误
      expect(() => gateway.sendMessage(offlineUserId, testMessage)).not.toThrow();
    });

    it('应该处理发送失败的情况', () => {
      const mockClient: any = {
        close: jest.fn(),
        send: jest.fn().mockImplementation(() => {
          throw new Error('Send failed');
        }),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws?token=valid.jwt.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockReturnValue({ sub: mockUserId });

      gateway.handleConnection(mockClient, mockReq);

      const testMessage = { type: 'chat', content: 'Hello' };

      // 不应该抛出错误，应该被捕获
      expect(() => gateway.sendMessage(mockUserId, testMessage)).not.toThrow();
    });
  });

  describe('ping/pong机制', () => {
    it('应该响应ping消息', () => {
      const mockClient: any = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
      };

      const mockReq = {
        url: '/ws?token=valid.jwt.token',
        headers: {
          host: 'localhost:3000',
        },
      };

      jwtService.verify.mockReturnValue({ sub: mockUserId });

      gateway.handleConnection(mockClient, mockReq);

      const messageHandler = mockClient.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )[1];

      const pingMessage = Buffer.from(JSON.stringify({ type: 'ping' }));
      messageHandler(pingMessage);

      const pongCall = mockClient.send.mock.calls.find((call: any) =>
        call[0].includes('pong'),
      );
      expect(pongCall).toBeDefined();

      const pongData = JSON.parse(pongCall[0]);
      expect(pongData.type).toBe('pong');
      expect(pongData.data.timestamp).toBeDefined();
    });
  });
});
