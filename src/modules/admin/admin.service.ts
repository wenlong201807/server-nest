import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { PointsService } from '../points/points.service';
import { SquareService } from '../square/square.service';
import { CertificationService } from '../certification/certification.service';
import { User } from '../user/entities/user.entity';
import { Certification } from '../certification/entities/certification.entity';
import { PostReport } from '../square/entities/report.entity';
import { SquarePost } from '../square/entities/post.entity';
import {
  UserStatus,
  CertificationStatus,
  PostStatus,
  HandleStatus,
  PointsSourceType,
} from '@common/constants';
import { AdminLoginDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Certification)
    private certificationRepository: Repository<Certification>,
    @InjectRepository(PostReport)
    private reportRepository: Repository<PostReport>,
    @InjectRepository(SquarePost)
    private postRepository: Repository<SquarePost>,
    private userService: UserService,
    private pointsService: PointsService,
    private squareService: SquareService,
    private certificationService: CertificationService,
  ) {}

  async login(dto: AdminLoginDto) {
    // TODO: 实现管理员认证
    if (dto.username === 'admin' && dto.password === 'admin123') {
      return {
        token: 'admin_token_' + Date.now(),
        admin: {
          id: 1,
          username: 'admin',
          role: 'super_admin',
        },
      };
    }
    throw new UnauthorizedException('用户名或密码错误');
  }
  async login22(dto: AdminLoginDto) {
    // TODO: 实现管理员认证
    if (dto.username === 'admin' && dto.password === 'admin123') {
      return {
        token: 'admin_token_' + Date.now(),
        admin: {
          id: 1,
          username: 'admin',
          role: 'super_admin',
        },
      };
    }
    throw new UnauthorizedException('用户名或密码错误');
  }

  async getUsers(
    page: number = 1,
    pageSize: number = 20,
    keyword?: string,
    status?: number,
  ) {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL');

    if (keyword) {
      queryBuilder.andWhere(
        '(user.mobile LIKE :keyword OR user.nickname LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (status !== undefined) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: list.map((u) => ({
        ...u,
        mobile: u.mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      })),
      total,
      page,
      pageSize,
    };
  }

  async adjustPoints(userId: number, amount: number, reason: string) {
    await this.pointsService.addPoints(
      userId,
      amount,
      PointsSourceType.REGISTER,
      0,
      reason,
    );
    return { message: '积分调整成功' };
  }

  async updateUserStatus(userId: number, status: UserStatus) {
    const user = await this.userService.findById(userId);
    user.status = status;
    await this.userRepository.save(user);
    return { message: '状态更新成功' };
  }

  async getCertifications(
    page: number = 1,
    pageSize: number = 20,
    status?: number,
  ) {
    const queryBuilder = this.certificationRepository
      .createQueryBuilder('cert')
      .leftJoinAndSelect('cert.user', 'user');

    if (status !== undefined) {
      queryBuilder.andWhere('cert.status = :status', { status });
    }

    queryBuilder.orderBy('cert.createdAt', 'DESC');

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async reviewCertification(id: number, status: number, rejectReason?: string) {
    if (status === CertificationStatus.APPROVED) {
      await this.certificationService.approve(id, 1);
    } else {
      await this.certificationService.reject(
        id,
        1,
        rejectReason || '审核未通过',
      );
    }
    return { message: '审核完成' };
  }

  async getPosts(
    page: number = 1,
    pageSize: number = 20,
    status?: number,
    keyword?: string,
  ) {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user');

    if (status !== undefined) {
      queryBuilder.andWhere('post.status = :status', { status });
    }

    if (keyword) {
      queryBuilder.andWhere('post.content LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    queryBuilder.orderBy('post.createdAt', 'DESC');

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async deletePost(id: number, reason?: string, deductPoints?: number) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    post.status = PostStatus.VIOLATION;
    await this.postRepository.save(post);

    if (deductPoints && deductPoints > 0) {
      await this.pointsService.addPoints(
        post.userId,
        -deductPoints,
        PointsSourceType.DEDUCT_VIOLATION,
        id,
        reason,
      );
    }

    return { message: '删除成功' };
  }

  async getReports(page: number = 1, pageSize: number = 20, status?: number) {
    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.post', 'post')
      .leftJoinAndSelect('report.reporter', 'reporter');

    if (status !== undefined) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    queryBuilder.orderBy('report.createdAt', 'DESC');

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async handleReport(id: number, action: string, deductPoints?: number) {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException('举报不存在');
    }

    report.status = HandleStatus.HANDLED;
    report.handledAt = new Date();
    report.handledBy = 1;
    await this.reportRepository.save(report);

    if (action === 'delete') {
      await this.deletePost(report.postId, '违规内容', deductPoints);
    }

    return { message: '处理完成' };
  }

  async getConfig() {
    // TODO: 从系统配置表读取
    return {
      'points.register': 2000,
      'points.sign': 10,
      'points.sign.continuous': 5,
      'points.publish': 5,
      'points.comment': 2,
      'points.like': 1,
      'points.invite': 100,
      'points.unlock_chat': 50,
    };
  }

  async updateConfig(config: Record<string, any>) {
    // TODO: 更新系统配置表
    return { message: '配置更新成功' };
  }

  async getStatistics(startDate?: string, endDate?: string) {
    const userCount = await this.userRepository.count({
      where: { deletedAt: null as any },
    });
    const postCount = await this.postRepository.count();

    return {
      user: {
        total: userCount,
      },
      content: {
        posts: postCount,
      },
      points: {
        totalIssued: 0,
        totalConsumed: 0,
      },
    };
  }
}
