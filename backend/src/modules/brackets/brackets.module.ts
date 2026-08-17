import { Module } from '@nestjs/common';
import { BracketsController } from './brackets.controller';
import { BracketsService } from './brackets.service';
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
  imports: [TournamentsModule],
  controllers: [BracketsController],
  providers: [BracketsService],
  exports: [BracketsService],
})
export class BracketsModule {}
