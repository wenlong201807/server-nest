import { Controller, Get, Put, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { FileService } from '../file/file.service';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('user')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  private rustfsDomain: string;

  constructor(
    private userService: UserService,
    private fileService: FileService,
    private configService: ConfigService,
  ) {
    this.rustfsDomain = this.configService.get('RUSTFS_DOMAIN') || 'http://localhost:9002';
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getCurrentUser(@CurrentUser('sub') userId: number) {
    const user = await this.userService.findById(userId);
    if (user.avatarPath) {
      user.avatarUrl = await this.fileService.generatePresignedUrl(user.avatarPath);
    }
    return user;
  }

  @Put('me')
  @ApiOperation({ summary: '更新用户信息' })
  async updateUser(@CurrentUser('sub') userId: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(userId, dto);
  }

  @Post('avatar')
  @ApiOperation({ summary: '上传头像' })
  async uploadAvatar(
    @CurrentUser('sub') userId: number,
    @Body() body: { filePath: string },
  ) {
    // 存储相对路径到file_record表
    const fileRecord = await this.fileService.create({
      filePath: body.filePath,
      fileName: body.filePath.split('/').pop() || '',
      originalName: 'avatar.jpg',
      mimeType: 'image/jpeg',
      fileExt: 'jpg',
      fileSize: 0,
      uploadUserId: userId,
      uploadNickname: '',
      type: 'avatar',
      status: 1,
    });

    // 生成预签名访问URL
    const avatarUrl = await this.fileService.generatePresignedUrl(body.filePath);
    
    // 更新用户头像：存储相对路径
    await this.userService.update(userId, { 
      avatarUrl: body.filePath,
      avatarPath: body.filePath,
    });

    return {
      id: fileRecord.id,
      filePath: body.filePath,
      url: avatarUrl,
    };
  }
}
