import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(dto: any) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
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
}
