import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { Public } from '../../common/decorators/public.decorator';
import { AdminLoginDto, LoginDto22 } from './dto/admin.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(TransformInterceptor)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Public()
  @Post('auth/login')
  @ApiOperation({ summary: '管理员登录' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
    // return this.adminService.login(username, password);
  }

  @Public()
  @Post('login22')
  @ApiOperation({ summary: '登录22' })
  async login22(@Body() abc: LoginDto22) {
    console.log(abc);
    // return this.authService.login(dto);
    return this.adminService.login22(abc);
  }

  @Get('users')
  @ApiOperation({ summary: '用户列表' })
  async getUsers(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('keyword') keyword?: string,
    @Query('status') status?: number,
  ) {
    return this.adminService.getUsers(page, pageSize, keyword, status);
  }

  @Post('users/:userId/points')
  @ApiOperation({ summary: '调整积分' })
  async adjustPoints(
    @Param('userId') userId: number,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
  ) {
    return this.adminService.adjustPoints(userId, amount, reason);
  }

  @Put('users/:userId/status')
  @ApiOperation({ summary: '封禁/解封用户' })
  async updateStatus(
    @Param('userId') userId: number,
    @Body('status') status: number,
  ) {
    return this.adminService.updateUserStatus(userId, status);
  }

  @Get('certifications')
  @ApiOperation({ summary: '审核列表' })
  async getCertifications(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('status') status?: number,
  ) {
    return this.adminService.getCertifications(page, pageSize, status);
  }

  @Put('certifications/:id/review')
  @ApiOperation({ summary: '审核认证' })
  async reviewCertification(
    @Param('id') id: number,
    @Body('status') status: number,
    @Body('rejectReason') rejectReason?: string,
  ) {
    return this.adminService.reviewCertification(id, status, rejectReason);
  }

  @Get('posts')
  @ApiOperation({ summary: '内容管理' })
  async getPosts(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('status') status?: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.adminService.getPosts(page, pageSize, status, keyword);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: '删除内容' })
  async deletePost(
    @Param('id') id: number,
    @Body('reason') reason?: string,
    @Body('deductPoints') deductPoints?: number,
  ) {
    return this.adminService.deletePost(id, reason, deductPoints);
  }

  @Get('reports')
  @ApiOperation({ summary: '举报列表' })
  async getReports(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('status') status?: number,
  ) {
    return this.adminService.getReports(page, pageSize, status);
  }

  @Put('reports/:id/handle')
  @ApiOperation({ summary: '处理举报' })
  async handleReport(
    @Param('id') id: number,
    @Body('action') action: string,
    @Body('deductPoints') deductPoints?: number,
  ) {
    return this.adminService.handleReport(id, action, deductPoints);
  }

  @Get('config')
  @ApiOperation({ summary: '获取系统配置' })
  async getConfig() {
    return this.adminService.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: '更新系统配置' })
  async updateConfig(@Body() config: Record<string, any>) {
    return this.adminService.updateConfig(config);
  }

  @Get('statistics')
  @ApiOperation({ summary: '数据统计' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getStatistics(startDate, endDate);
  }
}
