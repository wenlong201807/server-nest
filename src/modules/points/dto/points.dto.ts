import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';

export class GetLogsQueryDto {
  @ApiProperty({ description: '页码', required: false })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsOptional()
  @IsNumber()
  pageSize?: number = 20;

  @ApiProperty({ description: '类型 1:获得 2:消费', required: false })
  @IsOptional()
  @IsNumber()
  type?: number;
}
