import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/profile.entity';
import { UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
  ) {}

  async findByUserId(userId: number): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) {
      return this.create(userId);
    }
    return profile;
  }

  async create(userId: number): Promise<UserProfile> {
    const profile = this.profileRepository.create({ userId });
    return this.profileRepository.save(profile);
  }

  async update(userId: number, dto: UpdateProfileDto): Promise<UserProfile> {
    let profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepository.create({ userId });
    }
    Object.assign(profile, dto);
    return this.profileRepository.save(profile);
  }
}
