import { Injectable } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class WebSocketGatewayService {
  private gateway: ChatGateway;

  setGateway(gateway: ChatGateway) {
    this.gateway = gateway;
  }

  sendMessage(userId: number, message: any) {
    if (!this.gateway) {
      console.error('Gateway not initialized');
      return;
    }
    this.gateway.sendMessage(userId, message);
  }

  broadcastMessage(message: any) {
    if (!this.gateway) {
      console.error('Gateway not initialized');
      return;
    }
    // 广播给所有连接的用户
    this.gateway.server.clients.forEach((client: any) => {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('Broadcast error:', error);
      }
    });
  }
}
