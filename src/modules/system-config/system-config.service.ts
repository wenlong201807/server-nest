import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './system-config.entity';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private systemConfigRepository: Repository<SystemConfig>,
  ) {}

  async findAll(group?: string): Promise<SystemConfig[]> {
    const where = group ? { configKey: group } : {};
    return this.systemConfigRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findByKey(key: string): Promise<SystemConfig> {
    const config = await this.systemConfigRepository.findOne({
      where: { configKey: key },
    });
    if (!config) {
      throw new NotFoundException(`配置 ${key} 不存在`);
    }
    return config;
  }

  async getValue<T = string>(key: string, defaultValue?: T): Promise<T> {
    try {
      const config = await this.systemConfigRepository.findOne({
        where: { configKey: key },
      });
      if (!config) {
        return defaultValue as T;
      }
      return this.parseValue(config.configValue) as T;
    } catch {
      return defaultValue as T;
    }
  }

  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.getValue<string>(key, defaultValue.toString());
    return value === 'true';
  }

  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.getValue(key, defaultValue.toString());
    return parseInt(value as string, 10) || defaultValue;
  }

  async update(key: string, data: Partial<SystemConfig>): Promise<SystemConfig> {
    let config = await this.systemConfigRepository.findOne({ where: { configKey: key } });
    if (!config) {
      config = this.systemConfigRepository.create({ configKey: key });
    }
    Object.assign(config, data);
    return this.systemConfigRepository.save(config);
  }

  async create(data: Partial<SystemConfig>): Promise<SystemConfig> {
    const config = this.systemConfigRepository.create(data);
    return this.systemConfigRepository.save(config);
  }

  async delete(key: string): Promise<void> {
    await this.systemConfigRepository.delete({ configKey: key });
  }

  async getPublicConfigs(): Promise<Record<string, any>> {
    const configs = await this.systemConfigRepository.find({
      where: { isEnabled: true },
    });

    const result: Record<string, any> = {};
    const groups: Record<string, Record<string, any>> = {};

    configs.forEach((config) => {
      const key = config.configKey;
      const value = this.parseValue(config.configValue);

      if (config.isPublic) {
        const [group, ...rest] = key.split('.');
        const subKey = rest.join('.');

        if (!groups[group]) {
          groups[group] = {};
        }
        if (subKey) {
          groups[group][subKey] = value;
        } else {
          groups[group] = value;
        }
      }
    });

    return groups;
  }

  async getGroups(): Promise<{ name: string; count: number }[]> {
    const configs = await this.systemConfigRepository.find();
    const groups: Record<string, number> = {};

    configs.forEach((config) => {
      const [group] = config.configKey.split('.');
      groups[group] = (groups[group] || 0) + 1;
    });

    return Object.entries(groups).map(([name, count]) => ({ name, count }));
  }

  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async initDefaultConfigs(): Promise<void> {
    const defaultConfigs = [
      { configKey: 'app.name', configValue: '同城互助', valueType: 'string', group: 'general', description: '应用名称', isPublic: true },
      { configKey: 'signup.enabled', configValue: 'true', valueType: 'boolean', group: 'signup', description: '开放注册', isPublic: false },
      { configKey: 'signup.invite_required', configValue: 'false', valueType: 'boolean', group: 'signup', description: '是否需要邀请码', isPublic: true },
      { configKey: 'square.enabled', configValue: 'true', valueType: 'boolean', group: 'square', description: '广场功能开关', isPublic: true },
      { configKey: 'square.max_images', configValue: '9', valueType: 'number', group: 'square', description: '帖子最大图片数', isPublic: true },
      { configKey: 'chat.enabled', configValue: 'true', valueType: 'boolean', group: 'chat', description: '私聊功能开关', isPublic: true },
      { configKey: 'friend.max_count', configValue: '50', valueType: 'number', group: 'friend', description: '好友上限', isPublic: true },
      { configKey: 'friend.unlock_points', configValue: '50', valueType: 'number', group: 'friend', description: '解锁私聊所需积分', isPublic: true },
      { configKey: 'points.enabled', configValue: 'true', valueType: 'boolean', group: 'points', description: '积分功能开关', isPublic: true },
      { configKey: 'certification.enabled', configValue: 'true', valueType: 'boolean', group: 'certification', description: '认证功能开关', isPublic: true },
    ];

    for (const config of defaultConfigs) {
      const exists = await this.systemConfigRepository.findOne({
        where: { configKey: config.configKey },
      });
      if (!exists) {
        await this.systemConfigRepository.save(config);
      }
    }
  }
}
