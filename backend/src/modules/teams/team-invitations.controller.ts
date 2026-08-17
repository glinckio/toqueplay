import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { TeamMembersService } from './team-members.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Team Invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('team-invitations')
export class TeamInvitationsController {
  constructor(private readonly membersService: TeamMembersService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Listar convites pendentes do usuario logado' })
  @ApiResponse({ status: 200, description: 'Lista de convites pendentes' })
  async findPending(@CurrentUser('id') userId: string) {
    return this.membersService.findPendingInvitations(userId);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Aceitar convite para time' })
  @ApiResponse({ status: 200, description: 'Convite aceito' })
  @ApiResponse({ status: 404, description: 'Convite nao encontrado' })
  @ApiResponse({ status: 403, description: 'Usuario nao e o convidado' })
  async accept(
    @Param('id') invitationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.membersService.acceptInvitation(invitationId, userId);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Recusar convite para time' })
  @ApiResponse({ status: 200, description: 'Convite recusado' })
  @ApiResponse({ status: 404, description: 'Convite nao encontrado' })
  @ApiResponse({ status: 403, description: 'Usuario nao e o convidado' })
  async reject(
    @Param('id') invitationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.membersService.rejectInvitation(invitationId, userId);
  }
}
