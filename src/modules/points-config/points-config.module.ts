import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsConfig } from './entities/points-config.entity';
import { PointsConfigService } from './points-config.service';
import { PointsConfigController, PointsConfigPublicController } from './points-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PointsConfig])],
  controllers: [PointsConfigController, PointsConfigPublicController],
  providers: [PointsConfigService],
  exports: [PointsConfigService],
})
export class PointsConfigModule {}
