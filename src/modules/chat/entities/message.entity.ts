import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { MsgType } from '@common/constants';

@Entity('chat_messages')
@Index(['senderId', 'receiverId', 'createdAt'])
@Index(['receiverId', 'isRead'])
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  senderId: number;

  @Column({ type: 'bigint' })
  receiverId: number;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  content: string;

  @Column({ type: 'text', nullable: true })
  longContent: string;

  @Column({ type: 'tinyint', default: MsgType.TEXT })
  msgType: MsgType;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
