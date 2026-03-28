import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from './entities/friendship.entity';
import { UserBlacklist } from './entities/blacklist.entity';
import { UserService } from '../user/user.service';
import { PointsService } from '../points/points.service';
import { FriendStatus, PointsSourceType } from '@common/constants';

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(UserBlacklist)
    private blacklistRepository: Repository<UserBlacklist>,
    private userService: UserService,
    private pointsService: PointsService,
  ) {}

  async getFriendList(userId: number) {
    const list = await this.friendshipRepository.find({
      where: { userId, status: FriendStatus.FRIEND },
      relations: ['friend'],
    });

    return list.map(f => ({
      ...f,
      user: {
        id: f.friend.id,
        nickname: f.friend.nickname,
        avatarUrl: f.friend.avatarUrl,
        verified: f.friend.isVerified,
      },
    }));
  }

  async getFollowingList(userId: number) {
    const list = await this.friendshipRepository.find({
      where: { userId },
      relations: ['friend'],
    });

    return list.map(f => ({
      ...f,
      user: {
        id: f.friend.id,
        nickname: f.friend.nickname,
        avatarUrl: f.friend.avatarUrl,
        verified: f.friend.isVerified,
      },
    }));
  }

  async follow(userId: number, targetId: number) {
    if (userId === targetId) {
      throw new BadRequestException('不能添加自己');
    }

    const existing = await this.friendshipRepository.findOne({
      where: { userId, friendId: targetId },
    });

    if (existing) {
      throw new BadRequestException('关系已存在');
    }

    const friendship = this.friendshipRepository.create({
      userId,
      friendId: targetId,
      status: FriendStatus.FOLLOWING,
    });

    return this.friendshipRepository.save(friendship);
  }

  async unlockChat(userId: number, targetId: number) {
    const friendship = await this.friendshipRepository.findOne({
      where: { userId, friendId: targetId },
      relations: ['friend'],
    });

    if (!friendship) {
      throw new NotFoundException('请先关注对方');
    }

    if (friendship.status === FriendStatus.FRIEND) {
      throw new BadRequestException('已经是好友');
    }

    // TODO: 检查聊天次数是否达到8次
    if (friendship.chatCount < 8) {
      throw new BadRequestException('需要先互发8条消息');
    }

    // 检查积分
    const user = await this.userService.findById(userId);
    const requiredPoints = 50;
    if (user.points < requiredPoints) {
      throw new BadRequestException('积分不足');
    }

    // 扣除积分
    await this.pointsService.addPoints(userId, -requiredPoints, PointsSourceType.UNLOCK_CHAT, targetId, '解锁私聊');

    // 更新关系
    friendship.status = FriendStatus.FRIEND;
    await this.friendshipRepository.save(friendship);

    // 更新双向关系
    const reverseFriendship = await this.friendshipRepository.findOne({
      where: { userId: targetId, friendId: userId },
    });

    if (reverseFriendship) {
      reverseFriendship.status = FriendStatus.FRIEND;
      await this.friendshipRepository.save(reverseFriendship);
    }

    return { unlocked: true, pointsConsumed: requiredPoints };
  }

  async deleteFriend(userId: number, targetId: number) {
    const friendship = await this.friendshipRepository.findOne({
      where: { userId, friendId: targetId },
    });

    if (!friendship) {
      throw new NotFoundException('好友不存在');
    }

    await this.friendshipRepository.remove(friendship);
  }

  async blockUser(userId: number, targetId: number, reason?: string) {
    const existing = await this.blacklistRepository.findOne({
      where: { userId, blockedUserId: targetId },
    });

    if (existing) {
      throw new BadRequestException('已在黑名单中');
    }

    const blacklist = this.blacklistRepository.create({
      userId,
      blockedUserId: targetId,
      reason,
    });

    await this.blacklistRepository.save(blacklist);
  }

  async getBlocklist(userId: number) {
    const list = await this.blacklistRepository.find({
      where: { userId },
      relations: ['blockedUser'],
    });

    return list.map(b => ({
      ...b,
      user: {
        id: b.blockedUser.id,
        nickname: b.blockedUser.nickname,
        avatarUrl: b.blockedUser.avatarUrl,
      },
    }));
  }

  async isBlocked(userId: number, targetId: number): Promise<boolean> {
    const blocked = await this.blacklistRepository.findOne({
      where: { userId: targetId, blockedUserId: userId },
    });
    return !!blocked;
  }

  async isFriend(userId: number, targetId: number): Promise<boolean> {
    const friendship = await this.friendshipRepository.findOne({
      where: { userId, friendId: targetId, status: FriendStatus.FRIEND },
    });
    return !!friendship;
  }

  async getFriendshipStatus(userId: number, targetId: number) {
    const friendship = await this.friendshipRepository.findOne({
      where: { userId, friendId: targetId },
    });

    const user = await this.userService.findById(userId);
    const requiredPoints = 50;

    const isFriend = friendship?.status === FriendStatus.FRIEND;
    const isFollowing = !!friendship;
    const chatCount = friendship?.chatCount || 0;
    const canChat = isFriend || (isFollowing && chatCount >= 8 && user.points >= requiredPoints);

    return {
      isFriend,
      isFollowing,
      canChat,
      chatCount,
      requiredPoints,
      currentPoints: user.points,
    };
  }

  async updateChatCount(userId: number, friendId: number) {
    const friendship = await this.friendshipRepository.findOne({
      where: { userId, friendId },
    });
    if (friendship) {
      friendship.chatCount = (friendship.chatCount || 0) + 1;
      await this.friendshipRepository.save(friendship);
    }
  }
}
