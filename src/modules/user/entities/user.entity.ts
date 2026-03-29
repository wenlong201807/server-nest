import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Gender, UserStatus } from '@common/constants';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  mobile: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarPath: string;

  @Column({ type: 'tinyint', default: Gender.UNKNOWN })
  gender: Gender;

  @Column({ type: 'int', default: 2000 })
  points: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  inviteCode: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @Index()
  inviterCode: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'tinyint', default: UserStatus.NORMAL })
  @Index()
  status: UserStatus;

  @Column({ type: 'int', default: 0 })
  violationCount: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  @Index()
  deletedAt: Date;
}
