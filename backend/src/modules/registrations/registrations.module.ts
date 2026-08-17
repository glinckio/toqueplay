import { Module } from '@nestjs/common';
import { TournamentRegistrationsController } from './tournament-registrations.controller';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
  imports: [TournamentsModule],
  controllers: [
    TournamentRegistrationsController,
    RegistrationsController,
  ],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
