import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_config')
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  configKey: string;

  @Column({ type: 'text' })
  configValue: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
