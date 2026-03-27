import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SquareService } from './square.service';
import { CurrentUser } from '../../common/decorators/user.decorator';
import {
  CreatePostDto,
  CreateCommentDto,
  LikeDto,
  ReportDto,
} from './dto/square.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('square')
@Controller('square')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SquareController {
  constructor(private squareService: SquareService) {}

  @Post('posts')
  @ApiOperation({ summary: '发布帖子' })
  async createPost(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreatePostDto,
  ) {
    return this.squareService.createPost(userId, dto);
  }

  @Get('posts')
  @ApiOperation({ summary: '获取帖子列表' })
  async getPosts(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('sort') sort: string = 'latest',
  ) {
    const numPage = parseInt(page, 10) || 1;
    const numPageSize = parseInt(pageSize, 10) || 20;
    return this.squareService.getPosts(numPage, numPageSize, sort);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: '获取评论列表' })
  async getComments(
    @Param('id') postId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('sort') sort: 'time' | 'hot' = 'time',
  ) {
    return this.squareService.getComments(
      parseInt(postId, 10),
      parseInt(page, 10),
      parseInt(pageSize, 10),
      sort,
    );
  }

  @Get('posts/:id')
  @ApiOperation({ summary: '获取帖子详情' })
  async getPost(@Param('id') id: string) {
    return this.squareService.getPost(parseInt(id, 10));
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: '删除帖子' })
  async deletePost(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
  ) {
    return this.squareService.deletePost(userId, parseInt(id, 10));
  }

  @Post('comment')
  @ApiOperation({ summary: '评论帖子' })
  async createComment(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.squareService.createComment(userId, dto);
  }

  @Get('comments/:id/replies')
  @ApiOperation({ summary: '获取子评论' })
  async getReplies(
    @Param('id') commentId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '5',
  ) {
    const numPage = parseInt(page, 10) || 1;
    const numPageSize = parseInt(pageSize, 10) || 5;
    return this.squareService.getReplies(
      parseInt(commentId, 10),
      numPage,
      numPageSize,
    );
  }

  @Post('like')
  @ApiOperation({ summary: '点赞/取消点赞' })
  async toggleLike(@CurrentUser('sub') userId: number, @Body() dto: LikeDto) {
    return this.squareService.toggleLike(userId, dto);
  }

  @Post('report')
  @ApiOperation({ summary: '举报' })
  async report(@CurrentUser('sub') userId: number, @Body() dto: ReportDto) {
    return this.squareService.report(userId, dto);
  }
}
