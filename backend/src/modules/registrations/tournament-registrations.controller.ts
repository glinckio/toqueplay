import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegistrationsService } from './registrations.service';
import { RegisterTeamDto } from './dto/register-team.dto';
import { QueryRegistrationsDto } from './dto/query-registrations.dto';
import { SetPaidDto } from './dto/set-paid.dto';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Tournament Registrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tournaments/:tournamentId')
export class TournamentRegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscrever time em uma categoria' })
  @Audit('REGISTRATION_CREATED', 'Registration')
  async registerTeam(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterTeamDto,
  ) {
    return this.registrationsService.registerTeam(tournamentId, userId, dto);
  }

  @Get('registrations')
  @ApiOperation({ summary: 'Listar inscricoes do torneio (owner)' })
  async listRegistrations(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryRegistrationsDto,
  ) {
    return this.registrationsService.listByTournament(tournamentId, userId, query);
  }

  @Get('registered-members')
  @ApiOperation({ summary: 'Listar IDs dos membros já inscritos de um time neste torneio' })
  async getRegisteredMembers(
    @Param('tournamentId') tournamentId: string,
    @Query('teamId') teamId: string,
  ) {
    return this.registrationsService.getRegisteredMembers(tournamentId, teamId);
  }

  @Patch('registrations/:regId/confirm')
  @ApiOperation({ summary: 'Confirmar inscricao (owner)' })
  @Audit('REGISTRATION_CONFIRMED', 'Registration', { entityIdParam: 'regId' })
  async confirmRegistration(
    @Param('tournamentId') tournamentId: string,
    @Param('regId') regId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.registrationsService.confirmRegistration(tournamentId, regId, userId);
  }

  @Patch('registrations/:regId/paid')
  @ApiOperation({ summary: 'Marcar inscricao como paga/pendente (owner)' })
  @Audit('REGISTRATION_PAID_TOGGLED', 'Registration', { entityIdParam: 'regId' })
  async setRegistrationPaid(
    @Param('tournamentId') tournamentId: string,
    @Param('regId') regId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SetPaidDto,
  ) {
    return this.registrationsService.setRegistrationPaid(tournamentId, regId, userId, dto.paid);
  }

  @Patch('registrations/:regId/reject')
  @ApiOperation({ summary: 'Rejeitar inscricao (owner)' })
  @Audit('REGISTRATION_REJECTED', 'Registration', { entityIdParam: 'regId' })
  async rejectRegistration(
    @Param('tournamentId') tournamentId: string,
    @Param('regId') regId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.registrationsService.rejectRegistration(tournamentId, regId, userId);
  }
}
