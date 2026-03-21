import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { MsgType } from '@common/constants';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  @Index()
  senderId: number;

  @Column({ type: 'bigint' })
  @Index()
  receiverId: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'tinyint', default: MsgType.TEXT })
  msgType: MsgType;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  @Index(['senderId', 'receiverId'])
  createdAt: Date;
}
