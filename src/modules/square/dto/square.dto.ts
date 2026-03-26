import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { TargetType, ReportReason } from '@common/constants';

export class CreatePostDto {
  @ApiProperty({ description: '帖子内容' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '图片列表', required: false })
  @IsArray()
  @IsOptional()
  @Type(() => String)
  images?: string[];
}

export class CreateCommentDto {
  @ApiProperty({ description: '帖子ID' })
  @IsNumber()
  postId: number;

  @ApiProperty({ description: '父评论ID' })
  @IsNumber()
  @IsOptional()
  parentId?: number;

  @ApiProperty({ description: '评论内容' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class LikeDto {
  @ApiProperty({ description: '目标ID' })
  @IsNumber()
  targetId: number;

  @ApiProperty({ description: '目标类型', enum: TargetType })
  @IsEnum(TargetType)
  targetType: TargetType;
}

export class ReportDto {
  @ApiProperty({ description: '帖子ID' })
  @IsNumber()
  postId: number;

  @ApiProperty({ description: '举报原因', enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiProperty({ description: '举报描述' })
  @IsString()
  @IsOptional()
  description?: string;
}
