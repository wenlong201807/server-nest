import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('sign_records')
export class SignRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'int' })
  continuousDays: number;

  @Column({ type: 'int' })
  pointsEarned: number;

  @Column({ type: 'date' })
  signDate: Date;
}
