import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum FileStatus {
  NORMAL = 1,
  BLOCKED = 0,
}

@Entity('file_record')
export class FileRecord {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Index()
  @Column({ type: 'varchar', length: 500 })
  filePath: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'bigint', default: 0 })
  fileSize: number;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'varchar', length: 20 })
  fileExt: string;

  @Column({ type: 'varchar', length: 100, default: 'default' })
  bucketName: string;

  @Column({ type: 'int', nullable: true })
  width: number;

  @Column({ type: 'int', nullable: true })
  height: number;

  @Column({ type: 'tinyint', default: FileStatus.NORMAL })
  @Index()
  status: FileStatus;

  @Column({ type: 'int' })
  uploadUserId: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  uploadNickname: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  type: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
