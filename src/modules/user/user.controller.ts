import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('user')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getCurrentUser(@CurrentUser('sub') userId: number) {
    return this.userService.findById(userId);
  }

  @Put('me')
  @ApiOperation({ summary: '更新用户信息' })
  async updateUser(@CurrentUser('sub') userId: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(userId, dto);
  }
}
