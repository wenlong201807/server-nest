import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', unique: true })
  userId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  realName: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  hometown: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  residence: string;

  @Column({ type: 'int', nullable: true })
  height: number;

  @Column({ type: 'int', nullable: true })
  weight: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  occupation: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  income: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  education: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'boolean', default: true })
  showLocation: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @Index()
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 7, nullable: true })
  @Index()
  longitude: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
