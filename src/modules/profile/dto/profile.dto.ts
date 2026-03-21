import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ description: '真实姓名', required: false })
  @IsString()
  @IsOptional()
  realName?: string;

  @ApiProperty({ description: '出生日期', required: false })
  @IsDateString()
  @IsOptional()
  birthDate?: Date;

  @ApiProperty({ description: '籍贯', required: false })
  @IsString()
  @IsOptional()
  hometown?: string;

  @ApiProperty({ description: '居住地', required: false })
  @IsString()
  @IsOptional()
  residence?: string;

  @ApiProperty({ description: '身高', required: false })
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiProperty({ description: '体重', required: false })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiProperty({ description: '职业', required: false })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiProperty({ description: '月收入', required: false })
  @IsNumber()
  @IsOptional()
  income?: number;

  @ApiProperty({ description: '学历', required: false })
  @IsString()
  @IsOptional()
  education?: string;

  @ApiProperty({ description: '个人简介', required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ description: '是否显示位置', required: false })
  @IsBoolean()
  @IsOptional()
  showLocation?: boolean;

  @ApiProperty({ description: '纬度', required: false })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ description: '经度', required: false })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
