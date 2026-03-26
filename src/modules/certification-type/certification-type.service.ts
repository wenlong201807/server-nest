import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificationType } from './entities/certification-type.entity';

@Injectable()
export class CertificationTypeService {
  constructor(
    @InjectRepository(CertificationType)
    private certificationTypeRepository: Repository<CertificationType>,
  ) {}

  async findAll(enabledOnly: boolean = true): Promise<CertificationType[]> {
    const where = enabledOnly ? { isEnabled: true } : {};
    return this.certificationTypeRepository.find({
      where,
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<CertificationType> {
    const type = await this.certificationTypeRepository.findOne({ where: { id } });
    if (!type) {
      throw new NotFoundException(`认证类型 ${id} 不存在`);
    }
    return type;
  }

  async findByCode(code: string): Promise<CertificationType> {
    const type = await this.certificationTypeRepository.findOne({
      where: { code, isEnabled: true },
    });
    if (!type) {
      throw new NotFoundException(`认证类型 ${code} 不存在`);
    }
    return type;
  }

  async create(data: Partial<CertificationType>): Promise<CertificationType> {
    const type = this.certificationTypeRepository.create(data);
    return this.certificationTypeRepository.save(type);
  }

  async update(id: number, data: Partial<CertificationType>): Promise<CertificationType> {
    const type = await this.findOne(id);
    Object.assign(type, data);
    return this.certificationTypeRepository.save(type);
  }

  async delete(id: number): Promise<void> {
    await this.certificationTypeRepository.delete(id);
  }

  async initDefaultTypes(): Promise<void> {
    const defaultTypes = [
      {
        code: 'house',
        name: '房产认证',
        icon: '/icons/house.png',
        description: '房产证认证',
        requiredFields: ['name', 'id_card', 'property_book'],
        sortOrder: 1,
      },
      {
        code: 'education',
        name: '学历认证',
        icon: '/icons/edu.png',
        description: '学历证明认证',
        requiredFields: ['name', 'id_card', 'diploma'],
        sortOrder: 2,
      },
      {
        code: 'id_card',
        name: '身份证认证',
        icon: '/icons/idcard.png',
        description: '身份证实名认证',
        requiredFields: ['name', 'id_card', 'id_photo_front', 'id_photo_back'],
        sortOrder: 3,
      },
      {
        code: 'business',
        name: '营业执照',
        icon: '/icons/business.png',
        description: '企业认证',
        requiredFields: ['company_name', 'business_license'],
        sortOrder: 4,
      },
      {
        code: 'driver',
        name: '驾驶证',
        icon: '/icons/driver.png',
        description: '驾驶证认证',
        requiredFields: ['name', 'id_card', 'driver_license'],
        sortOrder: 5,
      },
    ];

    for (const type of defaultTypes) {
      const exists = await this.certificationTypeRepository.findOne({
        where: { code: type.code },
      });
      if (!exists) {
        await this.certificationTypeRepository.save(type);
      }
    }
  }
}
