import { Controller, Get, Put, Body, UseGuards, UseInterceptors, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UpdateProfileDto } from './dto/profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

@ApiTags('profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(TransformInterceptor)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get(':id')
  @ApiOperation({ summary: '获取用户资料' })
  async getProfile(@Param('id') id: number) {
    return this.profileService.findByUserId(id);
  }

  @Put()
  @ApiOperation({ summary: '更新用户资料' })
  async updateProfile(@CurrentUser('sub') userId: number, @Body() dto: UpdateProfileDto) {
    return this.profileService.update(userId, dto);
  }
}
