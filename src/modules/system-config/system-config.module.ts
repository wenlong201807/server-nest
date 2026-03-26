import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from './system-config.entity';
import { SystemConfigService } from './system-config.service';
import { SystemConfigAdminController, SystemConfigPublicController } from './system-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  controllers: [SystemConfigAdminController, SystemConfigPublicController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
