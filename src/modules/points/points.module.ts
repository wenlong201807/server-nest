import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { PointsLog } from './entities/points-log.entity';
import { UserModule } from '../user/user.module';
import { PointsConfigModule } from '../points-config/points-config.module';

@Module({
  imports: [TypeOrmModule.forFeature([PointsLog]), UserModule, PointsConfigModule],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
