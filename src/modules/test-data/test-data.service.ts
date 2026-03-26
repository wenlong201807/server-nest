import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { SquarePost } from '../square/entities/post.entity';
import { Certification } from '../certification/entities/certification.entity';
import { PointsLog } from '../points/entities/points-log.entity';
import { PostReport } from '../square/entities/report.entity';
import { PointsType, PointsSourceType, CertificationStatus, CertificationType } from '@common/constants';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

@Injectable()
export class TestDataService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(SquarePost)
    private postRepository: Repository<SquarePost>,
    @InjectRepository(Certification)
    private certificationRepository: Repository<Certification>,
    @InjectRepository(PointsLog)
    private pointsLogRepository: Repository<PointsLog>,
    @InjectRepository(PostReport)
    private reportRepository: Repository<PostReport>,
  ) {}

  async onModuleInit() {
    // Check if test data already exists
    const userCount = await this.userRepository.count();
    if (userCount > 0) {
      console.log('Test data already exists, skipping...');
      return;
    }
    
    console.log('Creating test data...');
    await this.createTestData();
    console.log('Test data created successfully!');
  }

  async createTestData() {
    // Create test users
    const users = await this.createUsers();
    
    // Create test posts
    await this.createPosts(users);
    
    // Create test certifications
    await this.createCertifications(users);
    
    // Create test points logs
    await this.createPointsLogs(users);
    
    // Create test reports
    await this.createReports(users);
  }

  private async createUsers() {
    const users = [];
    const testUsers = [
      { mobile: '13800000001', nickname: '用户A', points: 5000 },
      { mobile: '13800000002', nickname: '用户B', points: 3000 },
      { mobile: '13800000003', nickname: '用户C', points: 1000 },
    ];

    for (const u of testUsers) {
      const inviteCode = nanoid(8).toUpperCase();
      const user = this.userRepository.create({
        mobile: u.mobile,
        password: await bcrypt.hash('test123456', 10),
        nickname: u.nickname,
        points: u.points,
        inviteCode,
        gender: 1,
        status: 0,
      });
      const saved = await this.userRepository.save(user);
      users.push(saved);
    }

    return users;
  }

  private async createPosts(users: User[]) {
    const posts = [
      { userId: users[0].id, content: '这是一个测试帖子1', images: [] },
      { userId: users[0].id, content: '这是第二个测试帖子', images: [] },
      { userId: users[1].id, content: '用户B发布的帖子内容', images: [] },
      { userId: users[2].id, content: '用户C发布的有趣内容', images: [] },
    ];

    for (const p of posts) {
      const post = this.postRepository.create({
        userId: p.userId,
        content: p.content,
        images: p.images,
        likeCount: Math.floor(Math.random() * 100),
        commentCount: Math.floor(Math.random() * 20),
        status: 0,
      });
      await this.postRepository.save(post);
    }
  }

  private async createCertifications(users: User[]) {
    const certifications = [
      { userId: users[0].id, type: CertificationType.HOUSE, imageUrl: '/uploads/house1.jpg', description: '房产认证测试', status: CertificationStatus.PENDING },
      { userId: users[1].id, type: CertificationType.EDUCATION, imageUrl: '/uploads/edu1.jpg', description: '学历认证测试', status: CertificationStatus.APPROVED },
      { userId: users[2].id, type: CertificationType.ID_CARD, imageUrl: '/uploads/id1.jpg', description: '身份证认证测试', status: CertificationStatus.REJECTED },
    ];

    for (const c of certifications) {
      const cert = this.certificationRepository.create({
        userId: c.userId,
        type: c.type,
        imageUrl: c.imageUrl,
        description: c.description,
        status: c.status,
      });
      await this.certificationRepository.save(cert);
    }
  }

  private async createPointsLogs(users: User[]) {
    for (const user of users) {
      // 注册积分
      await this.pointsLogRepository.save({
        userId: user.id,
        type: PointsType.EARN,
        source: PointsSourceType.REGISTER,
        amount: 2000,
        balance: user.points,
        remark: '注册赠送',
      });

      // 签到积分
      await this.pointsLogRepository.save({
        userId: user.id,
        type: PointsType.EARN,
        source: PointsSourceType.SIGN,
        amount: 10,
        balance: user.points + 10,
        remark: '每日签到',
      });
    }
  }

  private async createReports(users: User[]) {
    const posts = await this.postRepository.find({ take: 2 });
    
    const reports = [
      { reporterId: users[1].id, postId: posts[0].id, reason: 1, description: '内容涉嫌色情' },
      { reporterId: users[2].id, postId: posts[1]?.id, reason: 3, description: '广告推广内容' },
    ];

    for (const r of reports) {
      if (r.postId) {
        await this.reportRepository.save({
          reporterId: r.reporterId,
          postId: r.postId,
          reason: r.reason,
          description: r.description,
          status: 0,
        });
      }
    }
  }
}
