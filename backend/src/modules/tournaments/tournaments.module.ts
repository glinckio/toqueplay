import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [TournamentsController],
  providers: [TournamentsService, StorageService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
