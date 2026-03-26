import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('points_config')
export class PointsConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  key: string;

  @Column({ type: 'int', default: 0 })
  value: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @Column({ type: 'tinyint', default: 1 })
  isEnabled: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
