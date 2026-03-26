import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UserService } from '../user/user.service';
import { PointsLog } from './entities/points-log.entity';
import { PointsType, PointsSourceType } from '@common/constants';
import { RedisService } from '../../common/redis/redis.service';
import { PointsConfigService } from '../points-config/points-config.service';

// 计算积分来源映射
const SOURCE_TYPE_MAP: Record<string, PointsSourceType> = {
  register: PointsSourceType.REGISTER,
  sign: PointsSourceType.SIGN,
  publish: PointsSourceType.PUBLISH,
  comment: PointsSourceType.COMMENT,
  like: PointsSourceType.LIKE,
  invite: PointsSourceType.INVITE,
  unlock_chat: PointsSourceType.UNLOCK_CHAT,
  buy_friend_slot: PointsSourceType.BUY_FRIEND_SLOT,
  deduct_violation: PointsSourceType.DEDUCT_VIOLATION,
};

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointsLog)
    private pointsLogRepository: Repository<PointsLog>,
    private userService: UserService,
    private redisService: RedisService,
    private pointsConfigService: PointsConfigService,
  ) {}

  async getBalance(userId: number) {
    const user = await this.userService.findById(userId);
    const totalEarned = await this.pointsLogRepository
      .createQueryBuilder('log')
      .select('SUM(log.amount)', 'total')
      .where('log.userId = :userId', { userId })
      .andWhere('log.type = :type', { type: PointsType.EARN })
      .getRawOne();

    const totalConsumed = await this.pointsLogRepository
      .createQueryBuilder('log')
      .select('SUM(ABS(log.amount))', 'total')
      .where('log.userId = :userId', { userId })
      .andWhere('log.type = :type', { type: PointsType.CONSUME })
      .getRawOne();

    return {
      balance: user.points,
      totalEarned: parseInt(totalEarned.total) || 0,
      totalConsumed: parseInt(totalConsumed.total) || 0,
    };
  }

  async addPoints(
    userId: number,
    amount: number,
    sourceType: PointsSourceType,
    sourceId: number = 0,
    description?: string,
  ): Promise<void> {
    const user = await this.userService.findById(userId);
    const balanceAfter = user.points + amount;

    const log = this.pointsLogRepository.create({
      userId,
      type: amount > 0 ? PointsType.EARN : PointsType.CONSUME,
      amount,
      balanceAfter,
      sourceType,
      sourceId,
      description: description || this.getDefaultDescription(sourceType),
    });

    await this.pointsLogRepository.save(log);
    await this.userService.updatePoints(userId, amount);

    // 清除用户缓存
    await this.redisService.del(`user:${userId}`);
  }

  async sign(userId: number) {
    const today = new Date().toISOString().split('T')[0];
    const key = `sign:${userId}:${today}`;

    const signed = await this.redisService.exists(key);
    if (signed) {
      throw new NotFoundException('今日已签到');
    }

    // 检查昨日签到
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayKey = `sign:${userId}:${yesterdayStr}`;
    const yesterdaySigned = await this.redisService.exists(yesterdayKey);

    let continuousDays = 1;
    if (yesterdaySigned) {
      const lastSign = await this.redisService.getJson<{ continuousDays: number }>(`sign:last:${userId}`);
      continuousDays = lastSign ? lastSign.continuousDays + 1 : 1;
    }

    // 从配置读取积分
    const basePoints = await this.pointsConfigService.getValue('sign', 10);
    const continuousBonus = await this.pointsConfigService.getValue('sign.continuous', 5);
    const maxContinuous = await this.pointsConfigService.getValue('sign.max_continuous', 7);

    let points = basePoints;
    const description = '每日签到';
    if (continuousDays > 1 && continuousDays <= maxContinuous) {
      points += continuousBonus;
    }

    await this.addPoints(userId, points, PointsSourceType.SIGN, 0, description);

    // 设置今日已签到
    await this.redisService.set(key, '1', 24 * 60 * 60);

    // 记录连续签到
    await this.redisService.setJson(`sign:last:${userId}`, { continuousDays }, 30 * 24 * 60 * 60);

    return {
      pointsEarned: points,
      continuousDays,
      balance: (await this.userService.findById(userId)).points,
    };
  }

  async getSignStatus(userId: number) {
    const today = new Date().toISOString().split('T')[0];
    const key = `sign:${userId}:${today}`;
    const signed = await this.redisService.exists(key);

    const lastSign = await this.redisService.getJson<{ continuousDays: number }>(`sign:last:${userId}`);

    return {
      signedToday: !!signed,
      continuousDays: lastSign?.continuousDays || 0,
    };
  }

  async getLogs(
    userId: number,
    page: number = 1,
    pageSize: number = 20,
    type?: number,
  ) {
    const queryBuilder = this.pointsLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .orderBy('log.createdAt', 'DESC');

    if (type !== undefined) {
      queryBuilder.andWhere('log.type = :type', { type });
    }

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  private getDefaultDescription(sourceType: PointsSourceType): string {
    const descriptions: Record<PointsSourceType, string> = {
      register: '注册赠送',
      sign: '每日签到',
      publish: '发布帖子',
      comment: '评论',
      like: '点赞',
      invite: '邀请好友',
      unlock_chat: '解锁私聊',
      buy_friend_slot: '购买好友位',
      deduct_violation: '违规扣除',
    };
    return descriptions[sourceType] || '积分变动';
  }
}
