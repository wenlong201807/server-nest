import { Module, Global } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { WebSocketGatewayService } from './websocket-gateway.service';

@Global()
@Module({
  providers: [ChatGateway, WebSocketGatewayService],
  exports: [WebSocketGatewayService],
})
export class GatewayModule {}
