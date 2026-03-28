import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileController } from './file.controller';
import { AdminFileController } from './admin-file.controller';
import { FileService } from './file.service';
import { FileRecord } from './entities/file-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FileRecord])],
  controllers: [FileController, AdminFileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
