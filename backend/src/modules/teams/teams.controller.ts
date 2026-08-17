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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar time' })
  @ApiResponse({ status: 201, description: 'Time criado com sucesso' })
  @Audit('TEAM_CREATED', 'Team')
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar meus times' })
  @ApiResponse({ status: 200, description: 'Lista de times' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.teamsService.findAll(userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar/listar times por nome, cidade e estado (paginado)' })
  async search(
    @Query('q') query: string,
    @Query('city') city: string,
    @Query('state') state: string,
    @Query('offset') offset: string,
    @Query('limit') limit: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamsService.search(
      query || '',
      userId,
      city,
      state,
      offset ? parseInt(offset, 10) : 0,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do time com elenco' })
  @ApiResponse({ status: 200, description: 'Detalhes do time' })
  @ApiResponse({ status: 404, description: 'Time nao encontrado' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar time (somente owner)' })
  @ApiResponse({ status: 200, description: 'Time atualizado' })
  @ApiResponse({ status: 403, description: 'Somente o owner pode editar' })
  @Audit('TEAM_UPDATED', 'Team', {
    fetchBefore: async (prisma, id) => prisma.team.findUnique({ where: { id }, select: { id: true, name: true, description: true, ownerId: true, sport: true } }),
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir time (somente owner)' })
  @ApiResponse({ status: 204, description: 'Time excluido' })
  @ApiResponse({ status: 403, description: 'Somente o owner pode excluir' })
  @Audit('TEAM_DELETED', 'Team', {
    fetchBefore: async (prisma, id) => prisma.team.findUnique({ where: { id }, select: { id: true, name: true, ownerId: true } }),
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.teamsService.remove(id, userId);
  }

  @Post(':id/avatar')
  @ApiOperation({ summary: 'Upload de brasão do time (somente owner)' })
  @ApiResponse({ status: 200, description: 'Brasão atualizado' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.teamsService.uploadAvatar(id, userId, file);
  }
}
