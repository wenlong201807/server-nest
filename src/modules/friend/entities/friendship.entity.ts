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
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  @Index()
  userId: number;

  @Column({ type: 'bigint' })
  @Index()
  friendId: number;

  @Column({ type: 'tinyint', default: FriendStatus.FOLLOWING })
  @Index()
  status: FriendStatus;

  @Column({ type: 'bigint', nullable: true })
  unlockPoints: number;

  @Column({ type: 'int', default: 0 })
  chatCount: number;

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
