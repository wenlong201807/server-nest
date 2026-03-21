import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TargetType } from '@common/constants';

@Entity('square_likes')
@Index(['userId', 'targetId', 'targetType'], { unique: true })
export class SquareLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'bigint' })
  targetId: number;

  @Column({ type: 'tinyint' })
  @Index()
  targetType: TargetType;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
