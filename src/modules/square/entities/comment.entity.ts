import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { SquarePost } from './post.entity';

@Entity('square_comments')
export class SquareComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  @Index()
  postId: number;

  @Column({ type: 'bigint' })
  @Index()
  userId: number;

  @Column({ type: 'bigint', nullable: true })
  @Index()
  parentId: number;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => SquarePost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: SquarePost;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => SquareComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: SquareComment;
}
