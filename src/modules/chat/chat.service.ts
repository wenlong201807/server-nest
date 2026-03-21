import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ChatMessage } from './entities/message.entity';
import { UserService } from '../user/user.service';
import { FriendService } from '../friend/friend.service';
import { SendMessageDto } from './dto/chat.dto';
import { MsgType } from '@common/constants';
import { WebSocketGatewayService } from '../websocket/websocket-gateway.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    private userService: UserService,
    private friendService: FriendService,
    private wsGateway: WebSocketGatewayService,
  ) {}

  async sendMessage(userId: number, dto: SendMessageDto) {
    // 检查是否是好友
    const friendship = await this.friendService.isFriend(userId, dto.receiverId);
    if (!friendship) {
      throw new BadRequestException('请先解锁私聊');
    }

    // 检查是否被拉黑
    const blocked = await this.friendService.isBlocked(userId, dto.receiverId);
    if (blocked) {
      throw new BadRequestException('对方已拉黑你');
    }

    // 创建消息
    const message = this.messageRepository.create({
      senderId: userId,
      receiverId: dto.receiverId,
      content: dto.content,
      msgType: dto.msgType || MsgType.TEXT,
    });

    const saved = await this.messageRepository.save(message);

    // 更新聊天次数
    await this.friendService.updateChatCount(userId, dto.receiverId);
    await this.friendService.updateChatCount(dto.receiverId, userId);

    // 推送消息
    this.wsGateway.sendMessage(dto.receiverId, {
      type: 'message',
      data: {
        id: saved.id,
        senderId: userId,
        receiverId: dto.receiverId,
        content: dto.content,
        msgType: dto.msgType || MsgType.TEXT,
        isRead: false,
        createdAt: saved.createdAt,
      },
    });

    return { id: saved.id, createdAt: saved.createdAt };
  }

  async getHistory(
    userId: number,
    targetId: number,
    page: number = 1,
    pageSize: number = 50,
    beforeId?: number,
  ) {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('msg')
      .where(
        '(msg.senderId = :userId AND msg.receiverId = :targetId) OR (msg.senderId = :targetId AND msg.receiverId = :userId)',
        { userId, targetId },
      )
      .orderBy('msg.createdAt', 'DESC');

    if (beforeId) {
      queryBuilder.andWhere('msg.id < :beforeId', { beforeId });
    }

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: list.reverse().map(msg => ({
        ...msg,
        isSelf: msg.senderId === userId,
      })),
      total,
      page,
      pageSize,
      hasMore: total > page * pageSize,
    };
  }

  async getConversations(userId: number) {
    // 获取最近的消息
    const messages = await this.messageRepository
      .createQueryBuilder('msg')
      .where('msg.senderId = :userId OR msg.receiverId = :userId', { userId })
      .orderBy('msg.createdAt', 'DESC')
      .getMany();

    // 按对方ID分组
    const conversations = new Map<number, any>();

    for (const msg of messages) {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;

      if (!conversations.has(otherUserId)) {
        const user = await this.userService.findById(otherUserId);
        const unreadCount = await this.getUnreadCount(userId, otherUserId);

        conversations.set(otherUserId, {
          userId: otherUserId,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          lastMessage: msg.content,
          lastTime: msg.createdAt,
          unreadCount,
        });
      }
    }

    return Array.from(conversations.values());
  }

  async markAsRead(userId: number, targetId: number) {
    await this.messageRepository.update(
      {
        senderId: targetId,
        receiverId: userId,
        isRead: false,
      },
      { isRead: true },
    );
  }

  private async getUnreadCount(userId: number, senderId: number): Promise<number> {
    return this.messageRepository.count({
      where: {
        senderId,
        receiverId: userId,
        isRead: false,
      },
    });
  }
}
