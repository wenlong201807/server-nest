import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserModule } from '../user/user.module';
import { PointsModule } from '../points/points.module';
import { SquareModule } from '../square/square.module';
import { CertificationModule } from '../certification/certification.module';
import { PointsConfigModule } from '../points-config/points-config.module';
import { User } from '../user/entities/user.entity';
import { Certification } from '../certification/entities/certification.entity';
import { PostReport } from '../square/entities/report.entity';
import { SquarePost } from '../square/entities/post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Certification, PostReport, SquarePost]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'wertogether_secret_key_2024',
        signOptions: { expiresIn: '7d' },
      }),
    }),
    UserModule,
    PointsModule,
    SquareModule,
    CertificationModule,
    PointsConfigModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
