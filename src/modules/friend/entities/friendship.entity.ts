import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { FriendStatus } from '@common/constants';

@Entity('friendships')
@Index(['userId', 'friendId'], { unique: true })
@Index(['friendId', 'status'])
@Index(['userId', 'status', 'updatedAt'])
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'bigint' })
  friendId: number;

  @Column({ type: 'tinyint', default: FriendStatus.FOLLOWING })
  @Index()
  status: FriendStatus;

  @Column({ type: 'int', unsigned: true, nullable: true })
  unlockPoints: number;

  @Column({ type: 'int', default: 0 })
  chatCount: number;

  @Column({ type: 'boolean', default: false })
  @Index()
  isMutual: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastChatAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'friendId' })
  friend: User;
}
