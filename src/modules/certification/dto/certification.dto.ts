import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { CertificationType } from '@common/constants';

export class CreateCertificationDto {
  @ApiProperty({ description: '认证类型', enum: CertificationType })
  @IsEnum(CertificationType)
  type: CertificationType;

  @ApiProperty({ description: '证明图片URL' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({ description: '描述信息', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
