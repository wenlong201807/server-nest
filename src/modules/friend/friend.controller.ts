import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FriendService } from './friend.service';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('friend')
@Controller('friend')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendController {
  constructor(private friendService: FriendService) {}

  @Get('list')
  @ApiOperation({ summary: '获取好友列表' })
  async getFriendList(@CurrentUser('sub') userId: number) {
    return this.friendService.getFriendList(userId);
  }

  @Get('following')
  @ApiOperation({ summary: '获取关注列表' })
  async getFollowingList(@CurrentUser('sub') userId: number) {
    return this.friendService.getFollowingList(userId);
  }

  @Post('follow')
  @ApiOperation({ summary: '添加关注' })
  async follow(@CurrentUser('sub') userId: number, @Body('userId') targetId: number) {
    return this.friendService.follow(userId, targetId);
  }

  @Post('unlock-chat')
  @ApiOperation({ summary: '解锁私聊' })
  async unlockChat(@CurrentUser('sub') userId: number, @Body('userId') targetId: number) {
    return this.friendService.unlockChat(userId, targetId);
  }

  @Delete(':userId')
  @ApiOperation({ summary: '删除好友' })
  async deleteFriend(@CurrentUser('sub') userId: number, @Param('userId') targetId: number) {
    return this.friendService.deleteFriend(userId, targetId);
  }

  @Post('block')
  @ApiOperation({ summary: '拉黑用户' })
  async blockUser(@CurrentUser('sub') userId: number, @Body('userId') targetId: number, @Body('reason') reason?: string) {
    return this.friendService.blockUser(userId, targetId, reason);
  }

  @Get('blocklist')
  @ApiOperation({ summary: '获取黑名单' })
  async getBlocklist(@CurrentUser('sub') userId: number) {
    return this.friendService.getBlocklist(userId);
  }
}
