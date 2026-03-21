import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SquareController } from './square.controller';
import { SquareService } from './square.service';
import { SquarePost } from './entities/post.entity';
import { SquareComment } from './entities/comment.entity';
import { SquareLike } from './entities/like.entity';
import { PostReport } from './entities/report.entity';
import { UserModule } from '../user/user.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SquarePost, SquareComment, SquareLike, PostReport]),
    UserModule,
    PointsModule,
  ],
  controllers: [SquareController],
  providers: [SquareService],
  exports: [SquareService],
})
export class SquareModule {}
