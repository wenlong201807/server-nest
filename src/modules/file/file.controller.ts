import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  Req,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileService } from './file.service';
import { FileRecord } from './entities/file-record.entity';
import { CurrentUser, JwtPayload } from '@common/decorators/user.decorator';

@Controller('file')
@UseGuards(AuthGuard('jwt'))
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get('config')
  async getConfig() {
    return this.fileService.getConfig();
  }

  @Post('presigned-put')
  async getPresignedPutUrl(
    @Body() body: { filePath: string },
  ) {
    const uploadUrl = await this.fileService.generatePresignedPutUrl(body.filePath);
    return {
      uploadUrl,
      filePath: body.filePath,
      expiresIn: 3600,
    };
  }

  @Post('upload')
  async upload(
    @Body() body: {
      filePath: string;
      originalName: string;
      mimeType: string;
      fileSize: number;
      type?: string;
      width?: number;
      height?: number;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    const ext = body.originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const file = await this.fileService.create({
      filePath: body.filePath,
      fileName: body.filePath.split('/').pop() || '',
      originalName: body.originalName,
      mimeType: body.mimeType,
      fileExt: ext,
      fileSize: body.fileSize || 0,
      uploadUserId: user.id || user.sub,
      uploadNickname: user.nickname || user.username || '',
      type: body.type || 'default',
      width: body.width,
      height: body.height,
      status: 1,
    });

    const url = await this.fileService.generatePresignedUrl(file.filePath);

    return {
      id: file.id,
      fileName: file.fileName,
      filePath: file.filePath,
      originalName: file.originalName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      fileExt: file.fileExt,
      width: file.width,
      height: file.height,
      url,
    };
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const file = await this.fileService.findById(id);
    return {
      id: file.id,
      fileName: file.fileName,
      filePath: file.filePath,
      url: this.fileService.getFileUrl(file.filePath),
      status: file.status,
      createdAt: file.createdAt,
    };
  }

  @Get(':id/url')
  async getUrl(@Param('id', ParseIntPipe) id: number) {
    const isBlocked = await this.fileService.isBlockedById(id);
    if (isBlocked) {
      return {
        url: null,
        blocked: true,
        expiresIn: 0,
      };
    }
    const url = await this.fileService.getFileUrlById(id);
    return {
      url,
      blocked: false,
      expiresIn: 86400,
    };
  }

  @Get('my/list')
  async getMyFiles(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('type') type?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.fileService.findByUser(
      user.id,
      page,
      pageSize,
      type,
    );

    return {
      list: result.list.map(file => ({
        id: file.id,
        fileName: file.fileName,
        filePath: file.filePath,
        url: this.fileService.getFileUrl(file.filePath),
        originalName: file.originalName,
        fileSize: file.fileSize,
        status: file.status,
        createdAt: file.createdAt,
      })),
      total: result.total,
      page,
      pageSize,
    };
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.fileService.softDelete(id);
    return { message: '删除成功' };
  }
}
