import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';
import { TeamInvitationsController } from './team-invitations.controller';
import { CpfService } from '../../common/services/cpf.service';
import { BracketsModule } from '../brackets/brackets.module';

@Module({
  imports: [BracketsModule],
  controllers: [TeamsController, TeamMembersController, TeamInvitationsController],
  providers: [TeamsService, TeamMembersService, CpfService],
  exports: [TeamsService, TeamMembersService],
})
export class TeamsModule {}
