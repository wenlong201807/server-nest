import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PointsType, PointsSourceType } from '@common/constants';

@Entity('points_logs')
export class PointsLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  @Index()
  userId: number;

  @Column({ type: 'tinyint' })
  type: PointsType;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ type: 'varchar', length: 50 })
  sourceType: PointsSourceType;

  @Column({ type: 'bigint', nullable: true })
  sourceId: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamp' })
  @Index()
  createdAt: Date;
}
