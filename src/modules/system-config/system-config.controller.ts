import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

class UpdateSystemConfigDto {
  @IsString()
  @IsOptional()
  configValue?: string;

  @IsString()
  @IsOptional()
  valueType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

class CreateSystemConfigDto {
  @IsString()
  configKey: string;

  @IsString()
  configValue: string;

  @IsString()
  @IsOptional()
  valueType?: string;

  @IsString()
  @IsOptional()
  group?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

@ApiTags('系统配置')
@Controller('admin/config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SystemConfigAdminController {
  constructor(private systemConfigService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取配置列表' })
  async findAll(@Query('group') group?: string) {
    const list = await this.systemConfigService.findAll(group);
    return { list };
  }

  @Get('groups')
  @ApiOperation({ summary: '获取配置分组' })
  async getGroups() {
    const list = await this.systemConfigService.getGroups();
    return { list };
  }

  @Get(':key')
  @ApiOperation({ summary: '获取单个配置' })
  async findOne(@Param('key') key: string) {
    return this.systemConfigService.findByKey(key);
  }

  @Post()
  @ApiOperation({ summary: '创建配置' })
  async create(@Body() dto: CreateSystemConfigDto) {
    const config = await this.systemConfigService.create(dto);
    return config;
  }

  @Put(':key')
  @ApiOperation({ summary: '更新配置' })
  async update(@Param('key') key: string, @Body() dto: UpdateSystemConfigDto) {
    await this.systemConfigService.update(key, dto);
    return { message: '配置更新成功' };
  }

  @Delete(':key')
  @ApiOperation({ summary: '删除配置' })
  async delete(@Param('key') key: string) {
    await this.systemConfigService.delete(key);
    return { message: '删除成功' };
  }

  @Post('init')
  @ApiOperation({ summary: '初始化默认配置' })
  async init() {
    await this.systemConfigService.initDefaultConfigs();
    return { message: '初始化成功' };
  }
}

@ApiTags('系统配置(公开)')
@Controller('public')
export class SystemConfigPublicController {
  constructor(private systemConfigService: SystemConfigService) {}

  @Public()
  @Get('config')
  @ApiOperation({ summary: '获取公开配置' })
  async getPublicConfig() {
    return this.systemConfigService.getPublicConfigs();
  }
}
