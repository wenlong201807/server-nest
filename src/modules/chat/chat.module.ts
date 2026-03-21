import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMessage } from './entities/message.entity';
import { UserModule } from '../user/user.module';
import { FriendModule } from '../friend/friend.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage]), UserModule, FriendModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
