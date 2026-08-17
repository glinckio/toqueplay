import { Module, forwardRef } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MatchesGateway } from './matches.gateway';
import { RedisModule } from '../../common/redis/redis.module';
import { RankingModule } from '../ranking/ranking.module';
import { BracketsModule } from '../brackets/brackets.module';

@Module({
  imports: [RedisModule, RankingModule, forwardRef(() => BracketsModule)],
  controllers: [MatchesController],
  providers: [MatchesService, MatchesGateway],
  exports: [MatchesService],
})
export class MatchesModule {}
