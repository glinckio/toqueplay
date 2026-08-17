import { Module } from '@nestjs/common';
import { FriendliesController } from './friendlies.controller';
import { FriendliesService } from './friendlies.service';

@Module({
  controllers: [FriendliesController],
  providers: [FriendliesService],
  exports: [FriendliesService],
})
export class FriendliesModule {}
