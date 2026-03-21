import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SquarePost } from './post.entity';
import { User } from '../../user/entities/user.entity';
import { ReportReason, HandleStatus } from '@common/constants';

@Entity('post_reports')
export class PostReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  @Index()
  postId: number;

  @Column({ type: 'bigint' })
  reporterId: number;

  @Column({ type: 'tinyint' })
  reason: ReportReason;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'tinyint', default: HandleStatus.PENDING })
  @Index()
  status: HandleStatus;

  @Column({ type: 'timestamp', nullable: true })
  handledAt: Date;

  @Column({ type: 'bigint', nullable: true })
  handledBy: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => SquarePost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: SquarePost;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;
}
