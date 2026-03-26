import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointsConfig } from './entities/points-config.entity';

@Injectable()
export class PointsConfigService {
  constructor(
    @InjectRepository(PointsConfig)
    private pointsConfigRepository: Repository<PointsConfig>,
  ) {}

  async findAll(): Promise<PointsConfig[]> {
    return this.pointsConfigRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(key: string): Promise<PointsConfig> {
    const config = await this.pointsConfigRepository.findOne({
      where: { key },
    });
    if (!config) {
      throw new NotFoundException(`积分配置 ${key} 不存在`);
    }
    return config;
  }

  async getValue(key: string, defaultValue: number = 0): Promise<number> {
    try {
      const config = await this.pointsConfigRepository.findOne({
        where: { key, isEnabled: true },
      });
      return config ? config.value : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async update(key: string, data: Partial<PointsConfig>): Promise<PointsConfig> {
    let config = await this.pointsConfigRepository.findOne({ where: { key } });
    if (!config) {
      config = this.pointsConfigRepository.create({ key });
    }
    Object.assign(config, data);
    return this.pointsConfigRepository.save(config);
  }

  async create(data: Partial<PointsConfig>): Promise<PointsConfig> {
    const config = this.pointsConfigRepository.create(data);
    return this.pointsConfigRepository.save(config);
  }

  async delete(id: number): Promise<void> {
    await this.pointsConfigRepository.delete(id);
  }

  async batchUpdate(
    configs: { key: string; value: number; description?: string }[],
  ): Promise<void> {
    for (const item of configs) {
      await this.update(item.key, { value: item.value, description: item.description });
    }
  }

  async initDefaultConfigs(): Promise<void> {
    const defaultConfigs = [
      { key: 'register', value: 2000, description: '注册赠送' },
      { key: 'sign', value: 10, description: '签到基础积分' },
      { key: 'sign.continuous', value: 5, description: '连续签到额外积分' },
      { key: 'sign.max_continuous', value: 7, description: '连续签到上限天数' },
      { key: 'publish', value: 5, description: '发布帖子' },
      { key: 'comment', value: 2, description: '评论' },
      { key: 'like', value: 1, description: '点赞' },
      { key: 'invite', value: 100, description: '邀请奖励' },
      { key: 'unlock_chat', value: 50, description: '解锁私聊' },
      { key: 'buy_friend_slot', value: 100, description: '购买好友位' },
    ];

    for (const config of defaultConfigs) {
      const exists = await this.pointsConfigRepository.findOne({
        where: { key: config.key },
      });
      if (!exists) {
        await this.pointsConfigRepository.save(config);
      }
    }
  }
}
