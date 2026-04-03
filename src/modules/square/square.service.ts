import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SquarePost } from './entities/post.entity';
import { SquareComment } from './entities/comment.entity';
import { SquareLike } from './entities/like.entity';
import { PostReport } from './entities/report.entity';
import {
  CreatePostDto,
  CreateCommentDto,
  LikeDto,
  ReportDto,
} from './dto/square.dto';
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
    // 生成内容预览（前500字符）
    const contentPreview = dto.content.length > 500
      ? dto.content.substring(0, 500) + '...'
      : dto.content;

    const post = this.postRepository.create({
      userId,
      content: dto.content,
      contentPreview,
      images: dto.images || [],
      hotScore: 0,
      viewCount: 0,
      shareCount: 0,
    });

    const saved = await this.postRepository.save(post);

    // 增加积分
    await this.pointsService.addPoints(
      userId,
      5,
      PointsSourceType.PUBLISH,
      saved.id,
    );

    return { id: saved.id, pointsEarned: 5 };
  }

  async getPosts(
    page: number = 1,
    pageSize: number = 20,
    sort: string = 'latest',
  ) {
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

    const transformedList = list.map((post) => ({
      ...post,
      user: post.user
        ? {
            id: post.user.id,
            nickname: post.user.nickname,
            avatarUrl: post.user.avatarUrl,
            verified: post.user.isVerified,
          }
        : null,
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
    const { postId, content, replyToId, replyToUserId, parentId } = dto;

    // 创建评论
    const comment = this.commentRepository.create({
      postId,
      userId,
      content,
      status: 1, // 默认正常状态
    });

    // 设置父子关系
    if (replyToId) {
      comment.replyToId = replyToId;
      comment.replyToUserId = replyToUserId ?? null;

      // 查询被回复的评论以确定rootId和parentId
      const replyToComment = await this.commentRepository.findOne({
        where: { id: replyToId },
      });

      if (replyToComment) {
        comment.rootId = replyToComment.rootId || replyToComment.id;
        comment.parentId = replyToComment.parentId || replyToComment.id;
      }
    } else {
      // 顶级评论
      comment.rootId = null;
      comment.parentId = null;
    }

    const savedComment = await this.commentRepository.save(comment);

    // 更新回复数统计
    if (comment.rootId) {
      // 更新根评论的回复数
      await this.commentRepository
        .createQueryBuilder()
        .update(SquareComment)
        .set({ replyCount: () => '`replyCount` + 1' })
        .where('id = :id', { id: comment.rootId })
        .execute();
    } else {
      // 更新帖子的评论数
      await this.postRepository
        .createQueryBuilder()
        .update(SquarePost)
        .set({ commentCount: () => '`commentCount` + 1' })
        .where('id = :id', { id: postId })
        .execute();
    }

    // 增加积分
    await this.pointsService.addPoints(
      userId,
      2,
      PointsSourceType.COMMENT,
      savedComment.id,
    );

    return {
      id: savedComment.id,
      message: '评论成功',
    };
  }

  async getComments(
    postId: number,
    page: number = 1,
    pageSize: number = 20,
    sort: 'time' | 'hot' | string = 'time',
  ) {
    try {
      const validPage = isNaN(page) || page < 1 ? 1 : page;
      const validPageSize = isNaN(pageSize) || pageSize < 1 ? 20 : pageSize;

      let queryBuilder = this.commentRepository
        .createQueryBuilder('comment')
        .leftJoinAndSelect('comment.user', 'user')
        .leftJoinAndSelect('comment.replyToUser', 'replyToUser')
        .where('comment.postId = :postId', { postId })
        .andWhere('comment.parentId IS NULL') // 只获取顶层评论
        .andWhere('comment.status = 1') // 只获取正常状态的评论
        .skip((validPage - 1) * validPageSize)
        .take(validPageSize);

      // 排序
      if (sort === 'hot') {
        queryBuilder = queryBuilder
          .orderBy('comment.likeCount', 'DESC')
          .addOrderBy('comment.createdAt', 'DESC');
      } else {
        queryBuilder = queryBuilder.orderBy('comment.createdAt', 'DESC');
      }

      const [comments, total] = await queryBuilder.getManyAndCount();

      // 获取每个顶层评论的回复（最多5条）
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          let replies: any[] = [];
          
          // 只有当rootId存在时才查询回复
          if (comment.rootId) {
            replies = await this.commentRepository
              .createQueryBuilder('comment')
              .leftJoinAndSelect('comment.user', 'user')
              .leftJoinAndSelect('comment.replyToUser', 'replyToUser')
              .where('comment.rootId = :rootId', { rootId: comment.id })
              .andWhere('comment.parentId IS NOT NULL') // 不包括自己
              .andWhere('comment.status = 1')
              .orderBy('comment.createdAt', 'ASC')
              .limit(5) // 最多获取5条回复
              .getMany();
          }

          return {
            ...comment,
            user: comment.user ? {
              id: comment.user.id,
              nickname: comment.user.nickname,
              avatarUrl: comment.user.avatarUrl,
            } : null,
            replyToUser: comment.replyToUser
              ? {
                  id: comment.replyToUser.id,
                  nickname: comment.replyToUser.nickname,
                }
              : null,
            replies: replies.map((reply) => ({
              ...reply,
              user: reply.user ? {
                id: reply.user.id,
                nickname: reply.user.nickname,
                avatarUrl: reply.user.avatarUrl,
              } : null,
              replyToUser: reply.replyToUser
                ? {
                    id: reply.replyToUser.id,
                    nickname: reply.replyToUser.nickname,
                  }
                : null,
            })),
          };
        }),
      );

      return {
        list: commentsWithReplies,
        total,
        page: validPage,
        pageSize: validPageSize,
      };
    } catch (error) {
      console.error('getComments error:', error);
      throw error;
    }
  }

  async getReplies(commentId: number, page: number = 1, pageSize: number = 20) {
    try {
      const validPage = isNaN(page) || page < 1 ? 1 : page;
      const validPageSize = isNaN(pageSize) || pageSize < 1 ? 20 : pageSize;

      const queryBuilder = this.commentRepository
        .createQueryBuilder('comment')
        .leftJoinAndSelect('comment.user', 'user')
        .leftJoinAndSelect('comment.replyToUser', 'replyToUser')
        .where('comment.rootId = :commentId', { commentId })
        .andWhere('comment.parentId IS NOT NULL') // 不包括根评论本身
        .andWhere('comment.status = 1')
        .orderBy('comment.createdAt', 'ASC')
        .skip((validPage - 1) * validPageSize)
        .take(validPageSize);

      const [list, total] = await queryBuilder.getManyAndCount();

      const transformedList = list.map((comment) => ({
        ...comment,
        user: comment.user ? {
          id: comment.user.id,
          nickname: comment.user.nickname,
          avatarUrl: comment.user.avatarUrl,
        } : null,
        replyToUser: comment.replyToUser
          ? {
              id: comment.replyToUser.id,
              nickname: comment.replyToUser.nickname,
            }
          : null,
      }));

      return {
        list: transformedList,
        total,
        page: validPage,
        pageSize: validPageSize,
      };
    } catch (error) {
      console.error('getReplies error:', error);
      throw error;
    }
  }

  private async getReplyCount(commentId: number): Promise<number> {
    return this.commentRepository.count({
      where: { parentId: commentId },
    });
  }

  async toggleLike(userId: number, dto: LikeDto) {
    const existing = await this.likeRepository.findOne({
      where: { userId, targetId: dto.targetId, targetType: dto.targetType },
    });

    if (existing) {
      // 取消点赞
      await this.likeRepository.remove(existing);

      if (dto.targetType === TargetType.POST) {
        await this.postRepository.decrement(
          { id: dto.targetId },
          'likeCount',
          1,
        );
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
        await this.postRepository.increment(
          { id: dto.targetId },
          'likeCount',
          1,
        );
      }

      // 增加积分
      await this.pointsService.addPoints(
        userId,
        1,
        PointsSourceType.LIKE,
        dto.targetId,
      );

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
