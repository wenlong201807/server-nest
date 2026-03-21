import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';
import { Friendship } from './entities/friendship.entity';
import { UserBlacklist } from './entities/blacklist.entity';
import { UserModule } from '../user/user.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship, UserBlacklist]), UserModule, PointsModule],
  controllers: [FriendController],
  providers: [FriendService],
  exports: [FriendService],
})
export class FriendModule {}
