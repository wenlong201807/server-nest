import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGatewayService } from './websocket-gateway.service';

@WebSocketGateway({
  path: '/ws',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');
  private userSocketMap = new Map<number, Set<WebSocket>>();

  constructor(
    private jwtService: JwtService,
    private wsService: WebSocketGatewayService,
  ) {
    this.wsService.setGateway(this);
  }

  handleConnection(client: WebSocket, req: any) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      this.logger.log(`Connection attempt, token: ${token ? 'present' : 'missing'}`);

      if (!token) {
        client.close();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      (client as any).userId = userId;

      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }
      const userSockets = this.userSocketMap.get(userId);
      if (userSockets) {
        userSockets.add(client);
      }

      this.logger.log(`User ${userId} connected`);

      client.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (error) {
          this.logger.error('Parse message error:', error);
        }
      });

      client.on('close', () => {
        this.handleDisconnect(client);
      });

      // 发送连接成功消息
      client.send(JSON.stringify({ type: 'connected', data: { userId } }));
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.close();
    }
  }

  handleDisconnect(client: WebSocket) {
    const userId = (client as any).userId;
    if (userId) {
      const sockets = this.userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(client);
        if (sockets.size === 0) {
          this.userSocketMap.delete(userId);
        }
      }
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  private handleMessage(client: WebSocket, message: any) {
    const userId = (client as any).userId;
    
    if (message.type === 'ping') {
      client.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
    }
  }

  sendMessage(userId: number, message: any) {
    const sockets = this.userSocketMap.get(userId);
    if (sockets) {
      const data = JSON.stringify(message);
      sockets.forEach(socket => {
        try {
          socket.send(data);
        } catch (error) {
          this.logger.error(`Send message to user ${userId} error:`, error);
        }
      });
    }
  }
}
