import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { SquarePost } from '../square/entities/post.entity';
import { SquareComment } from '../square/entities/comment.entity';
import { SquareLike } from '../square/entities/like.entity';
import { Certification } from '../certification/entities/certification.entity';
import { PointsLog } from '../points/entities/points-log.entity';
import { PostReport } from '../square/entities/report.entity';
import { Friendship } from '../friend/entities/friendship.entity';
import { ChatMessage } from '../chat/entities/message.entity';
import { PointsType, PointsSourceType, CertificationStatus, CertificationType, FriendStatus } from '@common/constants';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

@Injectable()
export class TestDataService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(SquarePost)
    private postRepository: Repository<SquarePost>,
    @InjectRepository(SquareComment)
    private commentRepository: Repository<SquareComment>,
    @InjectRepository(SquareLike)
    private likeRepository: Repository<SquareLike>,
    @InjectRepository(Certification)
    private certificationRepository: Repository<Certification>,
    @InjectRepository(PointsLog)
    private pointsLogRepository: Repository<PointsLog>,
    @InjectRepository(PostReport)
    private reportRepository: Repository<PostReport>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
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
    
    // Create test comments
    await this.createComments(users);
    
    // Create test likes
    await this.createLikes(users);
    
    // Create test friendships
    await this.createFriendships(users);
    
    // Create test chat messages
    await this.createChatMessages(users);
    
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

  private async createComments(users: User[]) {
    const posts = await this.postRepository.find({ take: 2 });
    if (posts.length === 0) return;

    const comments = [
      { postId: posts[0].id, userId: users[1].id, content: '这个帖子很有意思！', parentId: null, replyToId: null },
      { postId: posts[0].id, userId: users[2].id, content: '同意楼上观点', parentId: null, replyToId: null },
      { postId: posts[0].id, userId: users[0].id, content: '谢谢大家支持', parentId: null, replyToId: null },
    ];

    const savedComments = [];
    for (const c of comments) {
      const comment = this.commentRepository.create({
        postId: c.postId,
        userId: c.userId,
        content: c.content,
        parentId: c.parentId,
        replyToId: c.replyToId,
        replyToUserId: c.replyToId ? users[0].id : null,
        rootId: c.parentId,
        status: 1,
        replyCount: 0,
      });
      const saved = await this.commentRepository.save(comment);
      savedComments.push(saved);
    }

    // Create replies (sub-comments)
    if (savedComments.length > 0) {
      const replies = [
        { postId: posts[0].id, userId: users[2].id, content: '回复第一条评论', parentId: savedComments[0].id, replyToId: savedComments[0].id, rootId: savedComments[0].id },
        { postId: posts[0].id, userId: users[0].id, content: '回复用户C', parentId: savedComments[0].id, replyToId: savedComments[0].id, rootId: savedComments[0].id },
        { postId: posts[0].id, userId: users[1].id, content: '回复第二条评论', parentId: savedComments[1].id, replyToId: savedComments[1].id, rootId: savedComments[1].id },
      ];

      for (const r of replies) {
        const reply = this.commentRepository.create({
          postId: r.postId,
          userId: r.userId,
          content: r.content,
          parentId: r.parentId,
          replyToId: r.replyToId,
          replyToUserId: users[1].id,
          rootId: r.rootId,
          status: 1,
          replyCount: 0,
        });
        await this.commentRepository.save(reply);
      }

      // Update reply counts
      await this.commentRepository.update(savedComments[0].id, { replyCount: 2 });
      await this.commentRepository.update(savedComments[1].id, { replyCount: 1 });
    }

    // Update post comment counts
    await this.postRepository.update(posts[0].id, { commentCount: 6 });
  }

  private async createLikes(users: User[]) {
    const posts = await this.postRepository.find({ take: 2 });
    const comments = await this.commentRepository.find({ take: 3 });

    const likes = [
      { userId: users[1].id, targetId: posts[0].id, targetType: 1 },
      { userId: users[2].id, targetId: posts[0].id, targetType: 1 },
      { userId: users[0].id, targetId: posts[1].id, targetType: 1 },
      { userId: users[1].id, targetId: comments[0].id, targetType: 2 },
    ];

    for (const l of likes) {
      const like = this.likeRepository.create({
        userId: l.userId,
        targetId: l.targetId,
        targetType: l.targetType,
      });
      await this.likeRepository.save(like);
    }

    // Update like counts
    if (posts[0]) await this.postRepository.update(posts[0].id, { likeCount: 2 });
    if (posts[1]) await this.postRepository.update(posts[1].id, { likeCount: 1 });
  }

  private async createFriendships(users: User[]) {
    // User A follows User B
    await this.friendshipRepository.save({
      userId: users[0].id,
      friendId: users[1].id,
      status: FriendStatus.FOLLOWING,
    });

    // User A follows User C
    await this.friendshipRepository.save({
      userId: users[0].id,
      friendId: users[2].id,
      status: FriendStatus.FOLLOWING,
    });

    // User B follows User A
    await this.friendshipRepository.save({
      userId: users[1].id,
      friendId: users[0].id,
      status: FriendStatus.FOLLOWING,
    });

    // User C follows User A
    await this.friendshipRepository.save({
      userId: users[2].id,
      friendId: users[0].id,
      status: FriendStatus.FOLLOWING,
    });

    // User A unlocks chat with User B (become friends)
    await this.friendshipRepository.save({
      userId: users[0].id,
      friendId: users[1].id,
      status: FriendStatus.FRIEND,
    });

    // User B unlocks chat with User A (become friends)
    await this.friendshipRepository.save({
      userId: users[1].id,
      friendId: users[0].id,
      status: FriendStatus.FRIEND,
    });
  }

  private async createChatMessages(users: User[]) {
    const messages = [
      { senderId: users[0].id, receiverId: users[1].id, content: '你好，很高兴认识你！', msgType: 1 },
      { senderId: users[1].id, receiverId: users[0].id, content: '你好！很高兴认识你！', msgType: 1 },
      { senderId: users[0].id, receiverId: users[1].id, content: '今天天气不错', msgType: 1 },
      { senderId: users[1].id, receiverId: users[0].id, content: '是啊，适合出去走走', msgType: 1 },
      { senderId: users[0].id, receiverId: users[2].id, content: '用户C你好', msgType: 1 },
      { senderId: users[2].id, receiverId: users[0].id, content: '用户A你好！', msgType: 1 },
    ];

    for (const m of messages) {
      const message = this.messageRepository.create({
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        msgType: m.msgType,
        isRead: false,
      });
      await this.messageRepository.save(message);
    }
  }
}
