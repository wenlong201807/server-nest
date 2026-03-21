import { Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PointsService } from './points.service';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

@ApiTags('points')
@Controller('points')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(TransformInterceptor)
export class PointsController {
  constructor(private pointsService: PointsService) {}

  @Get('balance')
  @ApiOperation({ summary: '获取积分余额' })
  async getBalance(@CurrentUser('sub') userId: number) {
    return this.pointsService.getBalance(userId);
  }

  @Post('sign')
  @ApiOperation({ summary: '签到' })
  async sign(@CurrentUser('sub') userId: number) {
    return this.pointsService.sign(userId);
  }

  @Get('sign/status')
  @ApiOperation({ summary: '获取签到状态' })
  async getSignStatus(@CurrentUser('sub') userId: number) {
    return this.pointsService.getSignStatus(userId);
  }

  @Get('logs')
  @ApiOperation({ summary: '获取积分流水' })
  async getLogs(
    @CurrentUser('sub') userId: number,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('type') type?: number,
  ) {
    return this.pointsService.getLogs(userId, page, pageSize, type);
  }
}
