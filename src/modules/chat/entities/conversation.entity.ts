import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('conversations')
@Index(['userId1', 'userId2'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  userId1: number;

  @Column({ type: 'bigint' })
  userId2: number;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  lastMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastMessageAt: Date;

  @Column({ type: 'int', default: 0 })
  user1UnreadCount: number;

  @Column({ type: 'int', default: 0 })
  user2UnreadCount: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
