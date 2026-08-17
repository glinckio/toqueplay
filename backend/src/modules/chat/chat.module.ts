import { Module, OnModuleInit } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { TeamsService } from '../teams/teams.service';
import { FriendliesService } from '../friendlies/friendlies.service';
import { RedisModule } from '../../common/redis/redis.module';
import { TeamsModule } from '../teams/teams.module';
import { FriendliesModule } from '../friendlies/friendlies.module';

@Module({
  imports: [RedisModule, TeamsModule, FriendliesModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule implements OnModuleInit {
  constructor(
    private chatService: ChatService,
    private teamsService: TeamsService,
    private friendliesService: FriendliesService,
  ) {}

  onModuleInit() {
    this.teamsService.setChatService(this.chatService);
    this.friendliesService.setChatService(this.chatService);
  }
}
