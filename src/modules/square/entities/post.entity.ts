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
import { PostStatus } from '@common/constants';

@Entity('square_posts')
@Index(['status', 'createdAt'])
@Index(['userId', 'status'])
@Index(['hotScore', 'createdAt'])
export class SquarePost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'varchar', length: 500 })
  contentPreview: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  shareCount: number;

  @Column({ type: 'float', default: 0 })
  @Index()
  hotScore: number;

  @Column({ type: 'tinyint', default: PostStatus.NORMAL })
  @Index()
  status: PostStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
