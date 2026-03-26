import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PointsConfigService } from './points-config.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';

class UpdatePointsConfigDto {
  @IsNumber()
  @IsOptional()
  value?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

class BatchConfigItemDto {
  @IsString()
  key: string;

  @IsNumber()
  value: number;

  @IsString()
  @IsOptional()
  description?: string;
}

class BatchUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchConfigItemDto)
  configs: BatchConfigItemDto[];
}

@ApiTags('积分配置')
@Controller('admin/points-configs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PointsConfigController {
  constructor(private pointsConfigService: PointsConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取积分配置列表' })
  async findAll() {
    const list = await this.pointsConfigService.findAll();
    return { list };
  }

  @Get(':key')
  @ApiOperation({ summary: '获取单个积分配置' })
  async findOne(@Param('key') key: string) {
    return this.pointsConfigService.findOne(key);
  }

  @Put(':key')
  @ApiOperation({ summary: '更新积分配置' })
  async update(@Param('key') key: string, @Body() dto: UpdatePointsConfigDto) {
    await this.pointsConfigService.update(key, dto);
    return { message: '配置更新成功' };
  }

  @Post('batch')
  @ApiOperation({ summary: '批量更新积分配置' })
  @ApiBody({
    description: '批量更新积分配置请求体',
    examples: {
      default: {
        summary: '默认示例',
        value: {
          configs: [
            {
              key: 'points.register',
              value: 2000,
              description: '注册赠送积分',
            },
            {
              key: 'points.sign',
              value: 10,
              description: '每日签到积分',
            },
            {
              key: 'points.publish',
              value: 5,
              description: '发布帖子积分',
            },
            {
              key: 'points.comment',
              value: 2,
              description: '评论积分',
            },
            {
              key: 'points.like',
              value: 1,
              description: '点赞积分',
            },
          ],
        },
      },
      minimal: {
        summary: '最小示例',
        value: {
          configs: [
            {
              key: 'points.register',
              value: 2000,
            },
          ],
        },
      },
    },
  })
  async batchUpdate(@Body() dto: BatchUpdateDto) {
    await this.pointsConfigService.batchUpdate(dto.configs);
    return { message: '批量更新成功' };
  }

  @Post('init')
  @ApiOperation({ summary: '初始化默认配置' })
  async init() {
    await this.pointsConfigService.initDefaultConfigs();
    return { message: '初始化成功' };
  }
}

@ApiTags('积分配置(公开)')
@Controller('points-configs')
export class PointsConfigPublicController {
  constructor(private pointsConfigService: PointsConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取积分配置(公开)' })
  async findAll() {
    const list = await this.pointsConfigService.findAll();
    const config: Record<string, number> = {};
    list.forEach((item) => {
      if (item.isEnabled) {
        config[item.key] = item.value;
      }
    });
    return config;
  }
}
