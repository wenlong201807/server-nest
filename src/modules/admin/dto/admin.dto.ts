import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';

export enum LoginType {
  USERNAME = 'username',
  MOBILE_SMS = 'mobile_sms',
}

export class AdminLoginDto {
  @ApiProperty({ description: '登录类型', enum: LoginType, default: LoginType.USERNAME })
  @IsEnum(LoginType)
  @IsOptional()
  loginType?: LoginType = LoginType.USERNAME;

  @ApiProperty({ description: '用户名/手机号' })
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ description: '短信验证码' })
  @IsString()
  @IsOptional()
  code?: string;
}

export class AdminSmsDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @IsNotEmpty()
  mobile: string;
}
