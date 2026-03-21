import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certification } from './entities/certification.entity';
import { CreateCertificationDto } from './dto/certification.dto';
import { CertificationType, CertificationStatus } from '@common/constants';

@Injectable()
export class CertificationService {
  constructor(
    @InjectRepository(Certification)
    private certificationRepository: Repository<Certification>,
  ) {}

  async create(userId: number, dto: CreateCertificationDto) {
    const certification = this.certificationRepository.create({
      userId,
      type: dto.type,
      imageUrl: dto.imageUrl,
      description: dto.description,
      status: CertificationStatus.PENDING,
    });

    return this.certificationRepository.save(certification);
  }

  async getList(userId: number, status?: number) {
    const queryBuilder = this.certificationRepository
      .createQueryBuilder('cert')
      .where('cert.userId = :userId', { userId })
      .orderBy('cert.createdAt', 'DESC');

    if (status !== undefined) {
      queryBuilder.andWhere('cert.status = :status', { status });
    }

    return queryBuilder.getMany();
  }

  async approve(id: number, reviewerId: number) {
    const certification = await this.certificationRepository.findOne({ where: { id } });
    if (!certification) {
      throw new NotFoundException('认证不存在');
    }

    certification.status = CertificationStatus.APPROVED;
    certification.reviewedAt = new Date();
    certification.reviewedBy = reviewerId;

    await this.certificationRepository.save(certification);
  }

  async reject(id: number, reviewerId: number, reason: string) {
    const certification = await this.certificationRepository.findOne({ where: { id } });
    if (!certification) {
      throw new NotFoundException('认证不存在');
    }

    certification.status = CertificationStatus.REJECTED;
    certification.rejectReason = reason;
    certification.reviewedAt = new Date();
    certification.reviewedBy = reviewerId;

    await this.certificationRepository.save(certification);
  }
}
