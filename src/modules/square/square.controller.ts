import { Controller, Get, Post, Delete, Query, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SquareService } from './square.service';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { CreatePostDto, CreateCommentDto, LikeDto, ReportDto } from './dto/square.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('square')
@Controller('square')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SquareController {
  constructor(private squareService: SquareService) {}

  @Post('post')
  @ApiOperation({ summary: '发布帖子' })
  async createPost(@CurrentUser('sub') userId: number, @Body() dto: CreatePostDto) {
    return this.squareService.createPost(userId, dto);
  }

  @Get('posts')
  @ApiOperation({ summary: '获取帖子列表' })
  async getPosts(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('pageSize', ParseIntPipe) pageSize: number = 20,
    @Query('sort') sort: string = 'latest',
  ) {
    return this.squareService.getPosts(page, pageSize, sort);
  }

  @Get('post/:id')
  @ApiOperation({ summary: '获取帖子详情' })
  async getPost(@Param('id', ParseIntPipe) id: number) {
    return this.squareService.getPost(id);
  }

  @Delete('post/:id')
  @ApiOperation({ summary: '删除帖子' })
  async deletePost(@CurrentUser('sub') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.squareService.deletePost(userId, id);
  }

  @Post('comment')
  @ApiOperation({ summary: '评论帖子' })
  async createComment(@CurrentUser('sub') userId: number, @Body() dto: CreateCommentDto) {
    return this.squareService.createComment(userId, dto);
  }

  @Get('post/:id/comments')
  @ApiOperation({ summary: '获取评论列表' })
  async getComments(@Param('id', ParseIntPipe) postId: number, @Query('page', ParseIntPipe) page: number = 1, @Query('pageSize', ParseIntPipe) pageSize: number = 20) {
    return this.squareService.getComments(postId, page, pageSize);
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
