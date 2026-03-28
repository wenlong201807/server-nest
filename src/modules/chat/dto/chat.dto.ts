import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { MsgType } from '@common/constants';

export class SendMessageDto {
  @ApiProperty({ description: '接收者ID' })
  @IsNumber()
  @IsNotEmpty()
  receiverId: number;

  @ApiProperty({ description: '消息内容' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '消息类型', enum: MsgType, required: false })
  @IsEnum(MsgType)
  @IsOptional()
  msgType?: MsgType;
}
