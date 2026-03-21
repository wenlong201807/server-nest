import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class WebSocketGatewayService {
  private gateway: ChatGateway;

  setGateway(gateway: ChatGateway) {
    this.gateway = gateway;
  }

  sendMessage(userId: number, message: any) {
    const server = this.gateway.server;
    if (!server) return;

    // 发送给指定用户的所有Socket
    server.to(`user:${userId}`).emit('message', message);
  }

  broadcastMessage(event: string, message: any) {
    const server = this.gateway.server;
    if (!server) return;

    server.emit(event, message);
  }
}
