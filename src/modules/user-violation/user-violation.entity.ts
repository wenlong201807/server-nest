import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ViolationType } from '@common/constants';

@Entity('user_violations')
export class UserViolation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'tinyint' })
  violationType: ViolationType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  pointsDeducted: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
