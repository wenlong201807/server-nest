import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileService } from './file.service';

@Controller('admin/file')
@UseGuards(AuthGuard('jwt'))
export class AdminFileController {
  constructor(private readonly fileService: FileService) {}

  @Get('list')
  async getList(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('status') status?: number,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.fileService.findAll(
      page,
      pageSize,
      status,
      keyword,
      startDate,
      endDate,
    );

    return {
      list: result.list.map(file => ({
        id: file.id,
        fileName: file.fileName,
        filePath: file.filePath,
        url: this.fileService.getFileUrl(file.filePath),
        originalName: file.originalName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        status: file.status,
        uploadUserId: file.uploadUserId,
        uploadNickname: file.uploadNickname,
        createdAt: file.createdAt,
      })),
      total: result.total,
      page,
      pageSize,
    };
  }

  @Post(':id/block')
  async block(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    await this.fileService.block(id, reason);
    return { message: '拉黑成功' };
  }

  @Post(':id/unblock')
  async unblock(@Param('id', ParseIntPipe) id: number) {
    await this.fileService.unblock(id);
    return { message: '解除拉黑成功' };
  }

  @Post('batch-block')
  async batchBlock(
    @Body('ids') ids: number[],
    @Body('reason') reason?: string,
  ) {
    const count = await this.fileService.batchBlock(ids, reason);
    return { message: '批量拉黑成功', count };
  }
}
