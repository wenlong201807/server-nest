import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Gender } from '@common/constants';

export class UpdateUserDto {
  @ApiProperty({ description: '昵称', required: false })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({ description: '头像URL', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ description: '头像相对路径', required: false })
  @IsString()
  @IsOptional()
  avatarPath?: string;

  @ApiProperty({ description: '性别', enum: Gender, required: false })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;
}
