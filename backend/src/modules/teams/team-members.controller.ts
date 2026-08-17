import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { TeamMembersService } from './team-members.service';
import { AddMemberDto } from './dto/add-member.dto';
import { AddGuestDto } from './dto/add-guest.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Team Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams/:teamId/members')
export class TeamMembersController {
  constructor(private readonly membersService: TeamMembersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar membro por email' })
  @ApiResponse({ status: 201, description: 'Membro adicionado' })
  @ApiResponse({ status: 404, description: 'Usuario nao encontrado' })
  @ApiResponse({ status: 409, description: 'Usuario ja e membro ou CPF duplicado' })
  async addMember(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.membersService.addMember(teamId, userId, dto);
  }

  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar convidado externo' })
  @ApiResponse({ status: 201, description: 'Convidado adicionado' })
  async addGuest(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddGuestDto,
  ) {
    return this.membersService.addGuest(teamId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar elenco do time' })
  @ApiResponse({ status: 200, description: 'Lista de membros' })
  async findAll(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.membersService.findAll(teamId, userId);
  }

  @Patch(':memberId')
  @ApiOperation({ summary: 'Editar membro (capitania)' })
  @ApiResponse({ status: 200, description: 'Membro atualizado' })
  async update(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(teamId, memberId, userId, dto);
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro do time' })
  @ApiResponse({ status: 204, description: 'Membro removido' })
  async remove(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.membersService.remove(teamId, memberId, userId);
  }
}
