import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { SendMessageDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(TransformInterceptor)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('send')
  @ApiOperation({ summary: '发送消息' })
  async sendMessage(@CurrentUser('sub') userId: number, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(userId, dto);
  }

  @Get('history/:userId')
  @ApiOperation({ summary: '获取聊天记录' })
  async getHistory(
    @CurrentUser('sub') userId: number,
    @Param('userId') targetId: number,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 50,
    @Query('beforeId') beforeId?: number,
  ) {
    return this.chatService.getHistory(userId, targetId, page, pageSize, beforeId);
  }

  @Get('conversations')
  @ApiOperation({ summary: '获取会话列表' })
  async getConversations(@CurrentUser('sub') userId: number) {
    return this.chatService.getConversations(userId);
  }

  @Put('read/:userId')
  @ApiOperation({ summary: '标记已读' })
  async markAsRead(@CurrentUser('sub') userId: number, @Param('userId') targetId: number) {
    return this.chatService.markAsRead(userId, targetId);
  }
}
