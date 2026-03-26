import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificationType } from './entities/certification-type.entity';
import { CertificationTypeService } from './certification-type.service';
import {
  CertificationTypeAdminController,
  CertificationTypePublicController,
} from './certification-type.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CertificationType])],
  controllers: [CertificationTypeAdminController, CertificationTypePublicController],
  providers: [CertificationTypeService],
  exports: [CertificationTypeService],
})
export class CertificationTypeModule {}
