import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Gender } from '@common/constants';

export class SmsDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @IsNotEmpty()
  mobile: string;
}

export class RegisterDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @ApiProperty({ description: '验证码' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: '昵称' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ description: '性别', enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({ description: '邀请码' })
  @IsString()
  @IsOptional()
  inviteCode?: string;
}

// TODO
export class LoginDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
