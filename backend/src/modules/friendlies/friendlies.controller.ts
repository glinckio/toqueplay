import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FriendliesService } from './friendlies.service';
import { CreateFriendlyDto } from './dto/create-friendly.dto';
import { AcceptFriendlyDto } from './dto/accept-friendly.dto';
import { QueryFriendlyDto, NearbyQueryDto } from './dto/query-friendly.dto';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Friendlies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friendlies')
export class FriendliesController {
  constructor(private readonly friendliesService: FriendliesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar solicitacao de amistoso' })
  @ApiResponse({ status: 201, description: 'Amistoso criado' })
  @Audit('FRIENDLY_REQUESTED', 'Friendly')
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFriendlyDto,
  ) {
    return this.friendliesService.create(userId, dto);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Buscar amistosos proximos (geolocalizacao)' })
  async findNearby(@Query() query: NearbyQueryDto) {
    return this.friendliesService.findNearby(query);
  }

  @Get('explore')
  @ApiOperation({ summary: 'Explorar amistosos abertos na regiao' })
  async explore(@Query() query: NearbyQueryDto & { dateFrom?: string; dateTo?: string; city?: string }) {
    return this.friendliesService.explore(query);
  }

  @Get()
  @ApiOperation({ summary: 'Listar meus amistosos' })
  async findMine(
    @CurrentUser('id') userId: string,
    @Query() query: QueryFriendlyDto,
  ) {
    return this.friendliesService.findMine(userId, query);
  }

  @Post('referee-enter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Entrar com codigo de arbitro' })
  async enterRefereeCode(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    return this.friendliesService.enterRefereeCode(userId, code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do amistoso' })
  async findOne(
    @Param('id') friendlyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.friendliesService.findOne(friendlyId, userId);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Aceitar amistoso' })
  @Audit('FRIENDLY_ACCEPTED', 'Friendly', {
    fetchBefore: async (prisma, id) => prisma.friendly.findUnique({ where: { id }, select: { id: true, status: true, requesterTeamId: true, challengedTeamId: true } }),
  })
  async accept(
    @Param('id') friendlyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptFriendlyDto,
  ) {
    return this.friendliesService.accept(friendlyId, userId, dto);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Rejeitar amistoso' })
  @Audit('FRIENDLY_REJECTED', 'Friendly', {
    fetchBefore: async (prisma, id) => prisma.friendly.findUnique({ where: { id }, select: { id: true, status: true } }),
  })
  async reject(
    @Param('id') friendlyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.friendliesService.reject(friendlyId, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar amistoso' })
  @Audit('FRIENDLY_CANCELLED', 'Friendly', {
    fetchBefore: async (prisma, id) => prisma.friendly.findUnique({ where: { id }, select: { id: true, status: true } }),
  })
  async cancel(
    @Param('id') friendlyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.friendliesService.cancel(friendlyId, userId);
  }

  @Patch(':id/select-athletes')
  @ApiOperation({ summary: 'Selecionar atletas do time desafiado' })
  async selectAthletes(
    @Param('id') friendlyId: string,
    @CurrentUser('id') userId: string,
    @Body('athleteIds') athleteIds: string[],
  ) {
    return this.friendliesService.selectAthletes(friendlyId, userId, athleteIds);
  }

  @Post(':id/generate-referee-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gerar codigo de arbitro para amistoso' })
  async generateRefereeCode(
    @Param('id') friendlyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.friendliesService.generateRefereeCode(friendlyId, userId);
  }
}
