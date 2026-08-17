import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { AddFacilitiesDto } from './dto/add-facilities.dto';
import { AddSponsorsDto } from './dto/add-sponsors.dto';
import { QueryTournamentsDto } from './dto/query-tournaments.dto';
import { ExploreQueryDto } from './dto/explore-query.dto';
import { TournamentStatus } from '@prisma/client';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Tournaments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar torneio (rascunho)' })
  @ApiResponse({ status: 201, description: 'Torneio criado como DRAFT' })
  @Audit('TOURNAMENT_CREATED', 'Tournament')
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTournamentDto,
  ) {
    return this.tournamentsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados basicos do torneio' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTournamentDto,
  ) {
    return this.tournamentsService.update(id, userId, dto);
  }

  @Patch(':id/structure')
  @ApiOperation({ summary: 'Etapa 2 - Definir estrutura do evento' })
  @ApiResponse({ status: 403, description: 'Somente o owner pode editar' })
  async updateStructure(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStructureDto,
  ) {
    return this.tournamentsService.updateStructure(id, userId, dto);
  }

  @Post(':id/stages/:stageId/facilities')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Etapa 5 - Adicionar facilities a uma etapa' })
  async addStageFacilities(
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddFacilitiesDto,
  ) {
    return this.tournamentsService.addStageFacilities(id, stageId, userId, dto.facilities);
  }

  @Delete(':id/stages/:stageId/facilities/:facilityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover facility de uma etapa' })
  async removeStageFacility(
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Param('facilityId') facilityId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.tournamentsService.removeStageFacility(id, stageId, facilityId, userId);
  }

  @Post(':id/sponsors')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Etapa 6 - Adicionar patrocinadores' })
  async addSponsors(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddSponsorsDto,
  ) {
    return this.tournamentsService.addSponsors(id, userId, dto);
  }

  @Delete(':id/sponsors/:sponsorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover patrocinador' })
  async removeSponsor(
    @Param('id') id: string,
    @Param('sponsorId') sponsorId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.tournamentsService.removeSponsor(id, sponsorId, userId);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Etapa 7 - Resumo do torneio' })
  async getSummary(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tournamentsService.getSummary(id, userId);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publicar torneio' })
  @Audit('TOURNAMENT_PUBLISHED', 'Tournament', {
    fetchBefore: async (prisma, id) => prisma.tournament.findUnique({ where: { id }, select: { id: true, name: true, status: true, isPublished: true } }),
  })
  async publish(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tournamentsService.publish(id, userId);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Iniciar torneio (muda status para IN_PROGRESS)' })
  @Audit('TOURNAMENT_STARTED', 'Tournament', {
    fetchBefore: async (prisma, id) => prisma.tournament.findUnique({ where: { id }, select: { id: true, name: true, status: true } }),
  })
  async startTournament(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tournamentsService.startTournament(id, userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Finalizar torneio (muda status para FINISHED)' })
  @Audit('TOURNAMENT_FINISHED', 'Tournament', {
    fetchBefore: async (prisma, id) => prisma.tournament.findUnique({ where: { id }, select: { id: true, name: true, status: true } }),
  })
  async completeTournament(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tournamentsService.completeTournament(id, userId);
  }

  @Post(':id/generate-referee-code')
  @ApiOperation({ summary: 'Gerar código de arbitro para o torneio' })
  async generateRefereeCode(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tournamentsService.generateRefereeCode(id, userId);
  }

  @Post('referee-enter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Entrar como arbitro usando código' })
  async enterRefereeCode(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    return this.tournamentsService.enterRefereeCode(userId, code);
  }

  @Post(':id/referees')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar arbitro ao torneio por email' })
  async addReferee(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('email') email: string,
  ) {
    return this.tournamentsService.addReferee(id, userId, email);
  }

  @Delete(':id/referees/:refereeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover arbitro do torneio' })
  async removeReferee(
    @Param('id') id: string,
    @Param('refereeId') refereeId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.tournamentsService.removeReferee(id, userId, refereeId);
  }

  @Get(':id/referees')
  @ApiOperation({ summary: 'Listar arbitros do torneio' })
  async getReferees(@Param('id') id: string) {
    return this.tournamentsService.getReferees(id);
  }

  @Patch(':id/draft')
  @ApiOperation({ summary: 'Salvar como rascunho' })
  @Audit('TOURNAMENT_DRAFTED', 'Tournament', {
    fetchBefore: async (prisma, id) => prisma.tournament.findUnique({ where: { id }, select: { id: true, name: true, status: true } }),
  })
  async saveAsDraft(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tournamentsService.saveAsDraft(id, userId);
  }

  @Get('banners')
  @ApiOperation({ summary: 'Listar banners padrão disponíveis' })
  async getBanners() {
    return this.tournamentsService.getBanners();
  }

  @Post(':id/cover')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload de imagem de capa do torneio' })
  async uploadCover(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tournamentsService.uploadCover(id, userId, file);
  }

  @Patch(':id/banner-url')
  @ApiOperation({ summary: 'Definir URL de banner padrão para o torneio' })
  async setBannerUrl(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    return this.tournamentsService.setBannerUrl(id, userId, imageUrl);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Meus torneios' })
  async findMine(@CurrentUser('id') userId: string) {
    return this.tournamentsService.findMine(userId);
  }

  @Get('referee-mine')
  @ApiOperation({ summary: 'Torneios onde sou arbitro' })
  async findRefereeMine(@CurrentUser('id') userId: string) {
    return this.tournamentsService.findRefereeTournaments(userId);
  }

  @Get('explore')
  @ApiOperation({ summary: 'Explorar torneios com filtros avançados' })
  async explore(@Query() query: ExploreQueryDto) {
    if (query.latitude && query.longitude) {
      return this.tournamentsService.exploreWithNearby(query as any);
    }
    const items = await this.tournamentsService.explore(query);
    const hasMore = items.length > (query.limit || 20);
    const data = hasMore ? items.slice(0, -1) : items;
    return {
      nearby: [],
      all: data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id : null,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar torneios com filtros' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TournamentStatus })
  @ApiQuery({ name: 'categoryType', required: false })
  @ApiQuery({ name: 'categoryFormat', required: false })
  @ApiQuery({ name: 'categoryModality', required: false })
  async findAll(@Query() query: QueryTournamentsDto) {
    return this.tournamentsService.findAll(query);
  }

  @Public()
  @Get('visitor-nearby')
  @ApiOperation({ summary: 'Torneios acontecendo hoje perto de uma coordenada — sem login (modo visitante)' })
  @ApiQuery({ name: 'latitude', required: true })
  @ApiQuery({ name: 'longitude', required: true })
  @ApiQuery({ name: 'radius', required: false, description: 'Raio em km, padrão 1' })
  async findVisitorNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius?: string,
  ) {
    return this.tournamentsService.findVisitorNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseFloat(radius) : 1,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do torneio' })
  async findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Get(':id/public')
  @ApiOperation({ summary: 'Detalhes públicos do torneio' })
  async getPublicDetails(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tournamentsService.getPublicDetails(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar torneio' })
  @Audit('TOURNAMENT_CANCELLED', 'Tournament', {
    fetchBefore: async (prisma, id) => prisma.tournament.findUnique({ where: { id }, select: { id: true, name: true, status: true } }),
  })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.tournamentsService.cancel(id, userId);
  }
}
