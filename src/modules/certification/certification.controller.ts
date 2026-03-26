import { Controller, Get, Post, UseGuards, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificationService } from './certification.service';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { CreateCertificationDto } from './dto/certification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('certification')
@Controller('certification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CertificationController {
  constructor(private certificationService: CertificationService) {}

  @Post()
  @ApiOperation({ summary: '提交认证' })
  async create(@CurrentUser('sub') userId: number, @Body() dto: CreateCertificationDto) {
    return this.certificationService.create(userId, dto);
  }

  @Get('list')
  @ApiOperation({ summary: '获取认证列表' })
  async getList(@CurrentUser('sub') userId: number, @Query('status') status?: number) {
    return this.certificationService.getList(userId, status);
  }
}
