import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserModule } from '../user/user.module';
import { PointsModule } from '../points/points.module';
import { SquareModule } from '../square/square.module';
import { CertificationModule } from '../certification/certification.module';
import { User } from '../user/entities/user.entity';
import { Certification } from '../certification/entities/certification.entity';
import { PostReport } from '../square/entities/report.entity';
import { SquarePost } from '../square/entities/post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Certification, PostReport, SquarePost]),
    UserModule,
    PointsModule,
    SquareModule,
    CertificationModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
