import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestDataService } from './test-data.service';
import { User } from '../user/entities/user.entity';
import { SquarePost } from '../square/entities/post.entity';
import { SquareComment } from '../square/entities/comment.entity';
import { SquareLike } from '../square/entities/like.entity';
import { Certification } from '../certification/entities/certification.entity';
import { PointsLog } from '../points/entities/points-log.entity';
import { PostReport } from '../square/entities/report.entity';
import { Friendship } from '../friend/entities/friendship.entity';
import { ChatMessage } from '../chat/entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    User, 
    SquarePost, 
    SquareComment,
    SquareLike,
    Certification, 
    PointsLog, 
    PostReport,
    Friendship,
    ChatMessage
  ])],
  providers: [TestDataService],
  exports: [TestDataService],
})
export class TestDataModule {}
