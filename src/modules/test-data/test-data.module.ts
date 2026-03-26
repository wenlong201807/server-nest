import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestDataService } from './test-data.service';
import { User } from '../user/entities/user.entity';
import { SquarePost } from '../square/entities/post.entity';
import { Certification } from '../certification/entities/certification.entity';
import { PointsLog } from '../points/entities/points-log.entity';
import { PostReport } from '../square/entities/report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, SquarePost, Certification, PointsLog, PostReport])],
  providers: [TestDataService],
  exports: [TestDataService],
})
export class TestDataModule {}
