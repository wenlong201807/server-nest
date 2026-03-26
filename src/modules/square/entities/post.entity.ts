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
export class SquarePost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  @Index()
  userId: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'tinyint', default: PostStatus.NORMAL })
  @Index()
  status: PostStatus;

  @CreateDateColumn({ type: 'timestamp' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
