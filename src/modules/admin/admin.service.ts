import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { PointsService } from '../points/points.service';
import { SquareService } from '../square/square.service';
import { CertificationService } from '../certification/certification.service';
import { PointsConfigService } from '../points-config/points-config.service';
import { RedisService } from '@common/redis/redis.service';
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
import { AdminLoginDto, LoginType } from './dto/admin.dto';

interface AdminUser {
  id: number;
  username: string;
  mobile: string;
  role: string;
}

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
    private pointsConfigService: PointsConfigService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async sendSms(mobile: string) {
    const rateKey = `admin:sms:rate:${mobile}`;
    const rate = await this.redisService.get(rateKey);
    if (rate) {
      throw new UnauthorizedException('发送过于频繁，请稍后再试');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `admin:sms:code:${mobile}`;

    await this.redisService.setJson(key, { code, createdAt: Date.now() }, 300);
    await this.redisService.set(rateKey, '1', 60);

    this.logger.log(`管理员验证码: ${code}`);

    return { message: '验证码已发送' };
  }

  async login(dto: AdminLoginDto) {
    const loginType = dto.loginType || LoginType.USERNAME;

    if (loginType === LoginType.MOBILE_SMS) {
      return this.loginBySms(dto.account, dto.code);
    }

    return this.loginByPassword(dto.account, dto.password);
  }

  private async loginByPassword(username: string, password?: string) {
    if (!password) {
      throw new UnauthorizedException('密码不能为空');
    }

    const adminUsername = this.configService.get('ADMIN_USERNAME') || 'admin';
    const adminPassword = this.configService.get('ADMIN_PASSWORD') || 'admin123';

    if (username !== adminUsername) {
      throw new UnauthorizedException('管理员不存在');
    }

    if (password !== adminPassword) {
      throw new UnauthorizedException('密码错误');
    }

    return this.generateToken({
      id: 1,
      username: adminUsername,
      mobile: '',
      role: 'super_admin',
    });
  }

  private async loginBySms(mobile: string, code?: string) {
    if (!code) {
      throw new UnauthorizedException('验证码不能为空');
    }

    const key = `admin:sms:code:${mobile}`;
    const stored = await this.redisService.getJson<{ code: string }>(key);
    if (!stored) {
      throw new UnauthorizedException('验证码已过期');
    }
    if (stored.code !== code) {
      throw new UnauthorizedException('验证码错误');
    }

    await this.redisService.del(key);

    const adminConfig = this.configService.get('ADMIN_CONFIG');
    const admins = adminConfig?.admins || [];
    const admin = admins.find((a: any) => a.mobile === mobile);

    if (!admin) {
      throw new UnauthorizedException('该手机号未绑定管理员');
    }

    return this.generateToken({
      id: admin.id || 1,
      username: admin.username,
      mobile: admin.mobile,
      role: admin.role,
    });
  }

  private async generateToken(admin: AdminUser) {
    const payload = {
      sub: admin.id,
      username: admin.username,
      mobile: admin.mobile,
      role: admin.role,
      type: 'admin',
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        mobile: admin.mobile,
        role: admin.role,
      },
    };
  }

  async login22(dto: AdminLoginDto) {
    return this.login(dto);
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

    if (status !== undefined && !isNaN(status)) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: list.map((u) => ({
        ...u,
        mobile: u.mobile ? u.mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
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

    if (status !== undefined && !isNaN(status)) {
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
    const list = await this.pointsConfigService.findAll();
    const config: Record<string, number> = {};
    list.forEach((item) => {
      config[`points.${item.key}`] = item.value;
    });
    return config;
  }

  async updateConfig(config: Record<string, any>) {
    const configs = Object.entries(config).map(([key, value]) => {
      const keyWithoutPrefix = key.replace('points.', '');
      return { key: keyWithoutPrefix, value: value as number };
    });
    await this.pointsConfigService.batchUpdate(configs);
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
