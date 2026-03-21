import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SquarePost } from './entities/post.entity';
import { SquareComment } from './entities/comment.entity';
import { SquareLike } from './entities/like.entity';
import { PostReport } from './entities/report.entity';
import { CreatePostDto, CreateCommentDto, LikeDto, ReportDto } from './dto/square.dto';
import { UserService } from '../user/user.service';
import { PointsService } from '../points/points.service';
import { PostStatus, TargetType, PointsSourceType } from '@common/constants';

@Injectable()
export class SquareService {
  constructor(
    @InjectRepository(SquarePost)
    private postRepository: Repository<SquarePost>,
    @InjectRepository(SquareComment)
    private commentRepository: Repository<SquareComment>,
    @InjectRepository(SquareLike)
    private likeRepository: Repository<SquareLike>,
    @InjectRepository(PostReport)
    private reportRepository: Repository<PostReport>,
    private userService: UserService,
    private pointsService: PointsService,
  ) {}

  async createPost(userId: number, dto: CreatePostDto) {
    const post = this.postRepository.create({
      userId,
      content: dto.content,
      images: dto.images || [],
    });

    const saved = await this.postRepository.save(post);

    // 增加积分
    await this.pointsService.addPoints(userId, 5, PointsSourceType.PUBLISH, saved.id);

    return { id: saved.id, pointsEarned: 5 };
  }

  async getPosts(page: number = 1, pageSize: number = 20, sort: string = 'latest') {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .where('post.status = :status', { status: PostStatus.NORMAL });

    if (sort === 'hot') {
      queryBuilder.orderBy('post.likeCount + post.commentCount', 'DESC');
    } else {
      queryBuilder.orderBy('post.createdAt', 'DESC');
    }

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const transformedList = list.map(post => ({
      ...post,
      user: {
        id: post.user.id,
        nickname: post.user.nickname,
        avatarUrl: post.user.avatarUrl,
        verified: post.user.isVerified,
      },
    }));

    return { list: transformedList, total, page, pageSize };
  }

  async getPost(id: number) {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    return {
      ...post,
      user: {
        id: post.user.id,
        nickname: post.user.nickname,
        avatarUrl: post.user.avatarUrl,
        verified: post.user.isVerified,
      },
    };
  }

  async deletePost(userId: number, id: number) {
    const post = await this.postRepository.findOne({ where: { id, userId } });
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    post.status = PostStatus.DELETED;
    await this.postRepository.save(post);
  }

  async createComment(userId: number, dto: CreateCommentDto) {
    const comment = this.commentRepository.create({
      postId: dto.postId,
      userId,
      parentId: dto.parentId,
      content: dto.content,
    });

    const saved = await this.commentRepository.save(comment);

    // 更新帖子评论数
    await this.postRepository.increment({ id: dto.postId }, 'commentCount', 1);

    // 增加积分
    await this.pointsService.addPoints(userId, 2, PointsSourceType.COMMENT, saved.id);

    return { id: saved.id, pointsEarned: 2 };
  }

  async getComments(postId: number, page: number = 1, pageSize: number = 20) {
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.postId = :postId', { postId })
      .orderBy('comment.createdAt', 'ASC');

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const transformedList = list.map(comment => ({
      ...comment,
      user: {
        id: comment.user.id,
        nickname: comment.user.nickname,
        avatarUrl: comment.user.avatarUrl,
      },
    }));

    return { list: transformedList, total, page, pageSize };
  }

  async toggleLike(userId: number, dto: LikeDto) {
    const existing = await this.likeRepository.findOne({
      where: { userId, targetId: dto.targetId, targetType: dto.targetType },
    });

    if (existing) {
      // 取消点赞
      await this.likeRepository.remove(existing);

      if (dto.targetType === TargetType.POST) {
        await this.postRepository.decrement({ id: dto.targetId }, 'likeCount', 1);
      }

      return { isLiked: false };
    } else {
      // 点赞
      const like = this.likeRepository.create({
        userId,
        targetId: dto.targetId,
        targetType: dto.targetType,
      });
      await this.likeRepository.save(like);

      if (dto.targetType === TargetType.POST) {
        await this.postRepository.increment({ id: dto.targetId }, 'likeCount', 1);
      }

      // 增加积分
      await this.pointsService.addPoints(userId, 1, PointsSourceType.LIKE, dto.targetId);

      return { isLiked: true, pointsEarned: 1 };
    }
  }

  async report(userId: number, dto: ReportDto) {
    const report = this.reportRepository.create({
      postId: dto.postId,
      reporterId: userId,
      reason: dto.reason,
      description: dto.description,
    });
    return this.reportRepository.save(report);
  }
}
