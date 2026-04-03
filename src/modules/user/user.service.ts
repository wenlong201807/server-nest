import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PasswordUtil } from '../../common/utils/password.util';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/user.dto';
import { PointsLog } from '../points/entities/points-log.entity';
import { PointsSourceType } from '@common/constants';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async create(dto: any) {
    const hashedPassword = await PasswordUtil.hash(dto.password);
    const user = this.userRepository.create({
      mobile: dto.mobile,
      password: hashedPassword,
      nickname: dto.nickname,
      gender: dto.gender,
      inviteCode: dto.inviteCode,
      inviterCode: dto.inviterCode,
      points: 2000,
    });
    return this.userRepository.save(user);
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async findByMobile(mobile: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { mobile } });
  }

  async findByInviteCode(inviteCode: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { inviteCode } });
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async updatePoints(id: number, points: number): Promise<User> {
    const user = await this.findById(id);
    user.points = Math.max(0, user.points + points);
    return this.userRepository.save(user);
  }

  async delete(id: number): Promise<void> {
    const user = await this.findById(id);
    user.deletedAt = new Date();
    await this.userRepository.save(user);
  }

  async createWithTransaction(dto: any): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      // 加密密码
      const hashedPassword = await PasswordUtil.hash(dto.password);

      // 创建用户
      const user = manager.create(User, {
        mobile: dto.mobile,
        password: hashedPassword,
        nickname: dto.nickname,
        gender: dto.gender,
        inviteCode: dto.inviteCode,
        inviterCode: dto.inviterCode,
        points: 2000,
      });
      await manager.save(user);

      // 初始积分日志
      await manager.save(PointsLog, {
        userId: user.id,
        points: 2000,
        sourceType: PointsSourceType.REGISTER,
        relatedId: 0,
        description: '注册赠送',
      });

      // 邀请人奖励
      if (dto.inviterCode) {
        const inviter = await manager.findOne(User, {
          where: { inviteCode: dto.inviterCode },
        });
        if (inviter) {
          inviter.points += 100;
          await manager.save(inviter);

          await manager.save(PointsLog, {
            userId: inviter.id,
            points: 100,
            sourceType: PointsSourceType.INVITE,
            relatedId: user.id,
            description: '邀请用户注册',
          });
        }
      }

      return user;
    });
  }
}
