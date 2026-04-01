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

  @Column()
  @Index()
  postId: number;

  @Column()
  @Index()
  userId: number;

  @Column({ nullable: true })
  @Index()
  parentId: number | null;

  @Column({ nullable: true })
  @Index()
  replyToId: number | null;

  @Column({ nullable: true })
  @Index()
  replyToUserId: number | null;

  @Column({ nullable: true })
  @Index()
  rootId: number | null;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ type: 'int', default: 0 })
  replyCount: number;

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

  @ManyToOne(() => SquareComment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replyToId' })
  replyTo: SquareComment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'replyToUserId' })
  replyToUser: User;
}
