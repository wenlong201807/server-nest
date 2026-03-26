import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificationTypeService } from './certification-type.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray } from 'class-validator';

class CreateCertificationTypeDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  requiredFields?: string[];

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

class UpdateCertificationTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  requiredFields?: string[];

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

@ApiTags('认证类型')
@Controller('admin/certification-types')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CertificationTypeAdminController {
  constructor(private certificationTypeService: CertificationTypeService) {}

  @Get()
  @ApiOperation({ summary: '获取认证类型列表' })
  async findAll() {
    const list = await this.certificationTypeService.findAll(false);
    return { list };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个认证类型' })
  async findOne(@Param('id') id: number) {
    return this.certificationTypeService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建认证类型' })
  async create(@Body() dto: CreateCertificationTypeDto) {
    const type = await this.certificationTypeService.create(dto);
    return type;
  }

  @Put(':id')
  @ApiOperation({ summary: '更新认证类型' })
  async update(@Param('id') id: number, @Body() dto: UpdateCertificationTypeDto) {
    await this.certificationTypeService.update(id, dto);
    return { message: '更新成功' };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除认证类型' })
  async delete(@Param('id') id: number) {
    await this.certificationTypeService.delete(id);
    return { message: '删除成功' };
  }

  @Post('init')
  @ApiOperation({ summary: '初始化默认认证类型' })
  async init() {
    await this.certificationTypeService.initDefaultTypes();
    return { message: '初始化成功' };
  }
}

@ApiTags('认证类型(公开)')
@Controller('certification-types')
export class CertificationTypePublicController {
  constructor(private certificationTypeService: CertificationTypeService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取可用的认证类型' })
  async findAll() {
    const list = await this.certificationTypeService.findAll(true);
    return {
      list: list.map((item) => ({
        code: item.code,
        name: item.name,
        icon: item.icon,
        description: item.description,
        requiredFields: item.requiredFields,
      })),
    };
  }
}
