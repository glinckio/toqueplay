import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { QueryAdminTournamentsDto } from './dto/query-admin-tournaments.dto';
import { QueryLogsDto } from './dto/query-logs.dto';
import { QueryMetricsDto } from './dto/query-metrics.dto';
import { UpdateSystemDto } from './dto/update-system.dto';
import { QueryAdminMatchesDto } from './dto/query-matches.dto';
import { QueryAdminAthletesDto } from './dto/query-athletes.dto';
import { UpdateTournamentAdminDto } from './dto/update-tournament-admin.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import {
  CreateFriendlyAdminDto,
  UpdateFriendlyAdminDto,
} from './dto/friendly-admin.dto';
import { QueryAdminFriendliesDto } from './dto/query-friendlies.dto';
import { CreateTournamentAdminDto } from './dto/create-tournament-admin.dto';
import {
  CreateRegistrationAdminDto,
  UpdateRegistrationMemberAdminDto,
  AddRegistrationMemberAdminDto,
} from './dto/registration-admin.dto';
import { SetRegistrationPaidDto } from './dto/set-registration-paid.dto';
import { QueryAuditLogsDto } from '../audit/dto/query-audit-logs.dto';
import { AuditService } from '../audit/audit.service';
import { Audit, AuditRead } from '../audit/audit.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles('SUPER_ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Dashboard ───────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard KPIs' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ─── User Management ─────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users with search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  listUsers(@Query() query: QueryUsersDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/export')
  @ApiOperation({ summary: 'Export users as CSV (PII masked by default)' })
  @ApiResponse({
    status: 200,
    description:
      'CSV with name/email/phone masked. Pass fullPii=true with a valid unlockToken from POST /admin/users/export-unlock for unmasked export.',
  })
  async exportUsersCsv(
    @Query('fullPii') fullPii: string | undefined,
    @Query('unlockToken') unlockToken: string | undefined,
    @CurrentUser() requester: { id: string; email: string },
    @Res() res: Response,
  ) {
    let useFullPii = false;
    if (fullPii === 'true') {
      if (!unlockToken) {
        res.status(400).json({ message: 'unlockToken required for fullPii export' });
        return;
      }
      const adminId = await this.adminService.assertFullPiiUnlock(unlockToken);
      useFullPii = true;
      await this.auditService.log({
        action: 'USER_PII_FULL_EXPORTED',
        entityType: 'User',
        entityId: adminId,
        actorId: requester.id,
        actorEmail: requester.email,
      });
    } else {
      await this.auditService.log({
        action: 'USERS_EXPORTED',
        entityType: 'User',
        entityId: requester.id,
        actorId: requester.id,
        actorEmail: requester.email,
      });
    }
    const csv = await this.adminService.exportUsersCsv({ fullPii: useFullPii });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="users-${Date.now()}.csv"`);
    res.send(csv);
  }

  @Post('users/export-unlock')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({
    summary:
      'Verify 2FA and issue a single-use unlock token for full-PII export',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns { unlockToken } valid for 5 minutes',
  })
  async unlockFullPiiExport(
    @CurrentUser('id') adminId: string,
    @Body() dto: { code: string },
  ) {
    const unlockToken = await this.adminService.unlockFullPiiExport(
      adminId,
      dto.code,
    );
    return { unlockToken };
  }

  @Patch('users/:id/block')
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked' })
  @Audit('USER_BLOCKED', 'User', {
    fetchBefore: async (prisma, id) => prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, status: true } }),
  })
  blockUser(@Param('id') id: string) {
    return this.adminService.blockUser(id);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail (admin)' })
  @ApiResponse({ status: 200, description: 'User detail' })
  @AuditRead('USER_PII_ACCESSED', 'User')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  @ApiOperation({
    summary: 'Update user (admin bypass — no business rules)',
  })
  @ApiResponse({ status: 200, description: 'User updated' })
  @Audit('USER_ADMIN_UPDATED', 'User', {
    fetchBefore: async (prisma, id) => prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, status: true, phone: true } }),
  })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch('users/:id/unblock')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  @Audit('USER_UNBLOCKED', 'User', {
    fetchBefore: async (prisma, id) => prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, status: true } }),
  })
  unblockUser(@Param('id') id: string) {
    return this.adminService.unblockUser(id);
  }

  // ─── Tournament Management ───────────────────────────────

  @Get('tournaments')
  @ApiOperation({ summary: 'List all tournaments with filters' })
  @ApiResponse({ status: 200, description: 'Paginated tournament list' })
  listTournaments(@Query() query: QueryAdminTournamentsDto) {
    return this.adminService.listTournaments(query);
  }

  @Get('tournaments/banners')
  @ApiOperation({ summary: 'Listar banners padrão disponíveis no MinIO' })
  getBanners() {
    return this.adminService.getBanners();
  }

  @Post('tournaments')
  @ApiOperation({ summary: 'Criar torneio completo (admin bypass)' })
  @ApiResponse({ status: 201, description: 'Tournament created' })
  @HttpCode(HttpStatus.CREATED)
  @Audit('TOURNAMENT_CREATED', 'Tournament')
  createTournament(@Body() dto: CreateTournamentAdminDto) {
    return this.adminService.createTournamentFull(dto);
  }

  @Patch('tournaments/:id/block')
  @ApiOperation({ summary: 'Block/flag a tournament' })
  @ApiResponse({ status: 200, description: 'Tournament blocked' })
  @Audit('TOURNAMENT_CANCELLED', 'Tournament', {
    fetchBefore: async (prisma, id) => prisma.tournament.findUnique({ where: { id }, select: { id: true, name: true, status: true } }),
  })
  blockTournament(@Param('id') id: string) {
    return this.adminService.blockTournament(id);
  }

  @Get('tournaments/:id')
  @ApiOperation({ summary: 'Get tournament detail (admin)' })
  @ApiResponse({ status: 200, description: 'Tournament detail' })
  getTournament(@Param('id') id: string) {
    return this.adminService.getTournament(id);
  }

  @Patch('tournaments/:id')
  @ApiOperation({
    summary: 'Update tournament (admin bypass — no business rules)',
  })
  @ApiResponse({ status: 200, description: 'Tournament updated' })
  @Audit('TOURNAMENT_UPDATED', 'Tournament', {
    fetchBefore: async (prisma, id) => prisma.tournament.findUnique({ where: { id }, select: { id: true, name: true, status: true, isPublished: true, ownerId: true } }),
  })
  updateTournament(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentAdminDto,
  ) {
    return this.adminService.updateTournament(id, dto);
  }

  @Patch('tournaments/:id/owner')
  @ApiOperation({ summary: 'Trocar organizador do torneio (admin)' })
  @ApiResponse({ status: 200, description: 'Owner atualizado' })
  changeTournamentOwner(@Param('id') id: string, @Body('ownerId') ownerId: string) {
    return this.adminService.changeTournamentOwner(id, ownerId);
  }

  @Post('tournaments/:id/cover')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload de banner do torneio (admin)' })
  @ApiResponse({ status: 200, description: 'Cover uploaded' })
  uploadTournamentCover(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.adminService.uploadCover(id, file);
  }

  // ─── Registration management ─────────────────────────────

  @Get('tournaments/:id/registrations')
  @ApiOperation({ summary: 'Listar inscrições de um torneio (admin)' })
  listRegistrations(@Param('id') id: string) {
    return this.adminService.listRegistrations(id);
  }

  @Post('tournaments/:id/registrations')
  @ApiOperation({ summary: 'Adicionar inscrição (admin)' })
  @ApiResponse({ status: 201, description: 'Registration created' })
  @HttpCode(HttpStatus.CREATED)
  createRegistration(
    @Param('id') id: string,
    @Body() dto: CreateRegistrationAdminDto,
  ) {
    return this.adminService.createRegistration(id, dto);
  }

  @Delete('registrations/:regId')
  @ApiOperation({ summary: 'Remover inscrição (admin)' })
  @HttpCode(HttpStatus.OK)
  deleteRegistration(@Param('regId') regId: string) {
    return this.adminService.deleteRegistration(regId);
  }

  @Patch('registrations/:regId/paid')
  @ApiOperation({ summary: 'Marcar inscrição como paga/pendente (organizador)' })
  @ApiResponse({ status: 200, description: 'Status de pagamento atualizado' })
  @Audit('REGISTRATION_PAID_TOGGLED', 'Registration', {
    entityIdParam: 'regId',
  })
  setRegistrationPaid(
    @Param('regId') regId: string,
    @Body() dto: SetRegistrationPaidDto,
  ) {
    return this.adminService.setRegistrationPaid(regId, dto.paid);
  }

  @Post('registrations/:regId/members')
  @ApiOperation({ summary: 'Adicionar membro à inscrição (admin)' })
  @HttpCode(HttpStatus.CREATED)
  addRegistrationMember(
    @Param('regId') regId: string,
    @Body() dto: AddRegistrationMemberAdminDto,
  ) {
    return this.adminService.addRegistrationMember(regId, dto);
  }

  @Patch('registrations/:regId/members/:memberId')
  @ApiOperation({ summary: 'Atualizar membro (capitão) — admin' })
  updateRegistrationMember(
    @Param('regId') regId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateRegistrationMemberAdminDto,
  ) {
    return this.adminService.updateRegistrationMember(regId, memberId, dto);
  }

  @Delete('registrations/:regId/members/:memberId')
  @ApiOperation({ summary: 'Remover membro da inscrição (admin)' })
  @HttpCode(HttpStatus.OK)
  removeRegistrationMember(
    @Param('regId') regId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.adminService.removeRegistrationMember(regId, memberId);
  }

  @Delete('tournaments/:id')
  @ApiOperation({ summary: 'Soft delete a tournament' })
  @ApiResponse({ status: 200, description: 'Tournament soft-deleted' })
  @HttpCode(HttpStatus.OK)
  deleteTournament(@Param('id') id: string) {
    return this.adminService.deleteTournament(id);
  }

  // ─── Match Management ────────────────────────────────────

  @Get('matches')
  @ApiOperation({ summary: 'List all matches with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated match list' })
  listMatches(@Query() query: QueryAdminMatchesDto) {
    return this.adminService.listMatches(query);
  }

  @Get('matches/:id')
  @ApiOperation({ summary: 'Get match detail (admin) — sets, events, points timeline' })
  @ApiResponse({ status: 200, description: 'Match detail' })
  getMatch(@Param('id') id: string) {
    return this.adminService.getMatch(id);
  }

  // ─── Athlete Management ──────────────────────────────────

  @Get('athletes')
  @ApiOperation({ summary: 'List registered athletes with aggregated stats' })
  @ApiResponse({ status: 200, description: 'Paginated athlete list' })
  @AuditRead('ATHLETE_PII_ACCESSED', 'Athlete')
  listAthletes(@Query() query: QueryAdminAthletesDto) {
    return this.adminService.listAthletes(query);
  }

  // ─── Friendly Management ─────────────────────────────────

  @Get('friendlies')
  @ApiOperation({ summary: 'List friendlies with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated friendly list' })
  listFriendlies(@Query() query: QueryAdminFriendliesDto) {
    return this.adminService.listFriendlies(query);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Atividade recente paginada (notificações admin)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de eventos recentes' })
  getRecentActivity(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getRecentActivity(
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
    );
  }

  @Get('teams')
  @ApiOperation({ summary: 'List teams (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated team list' })
  listTeams(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listTeams({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('friendlies/:id')
  @ApiOperation({ summary: 'Get friendly detail (admin)' })
  @ApiResponse({ status: 200, description: 'Friendly detail' })
  getFriendly(@Param('id') id: string) {
    return this.adminService.getFriendly(id);
  }

  @Post('friendlies')
  @ApiOperation({ summary: 'Create friendly (admin bypass)' })
  @ApiResponse({ status: 201, description: 'Friendly created' })
  @HttpCode(HttpStatus.CREATED)
  createFriendly(@Body() dto: CreateFriendlyAdminDto) {
    return this.adminService.createFriendly(dto);
  }

  @Patch('friendlies/:id')
  @ApiOperation({ summary: 'Update friendly (admin bypass)' })
  @ApiResponse({ status: 200, description: 'Friendly updated' })
  updateFriendly(
    @Param('id') id: string,
    @Body() dto: UpdateFriendlyAdminDto,
  ) {
    return this.adminService.updateFriendly(id, dto);
  }

  @Delete('friendlies/:id')
  @ApiOperation({ summary: 'Delete friendly' })
  @ApiResponse({ status: 200, description: 'Friendly deleted' })
  @HttpCode(HttpStatus.OK)
  deleteFriendly(@Param('id') id: string) {
    return this.adminService.deleteFriendly(id);
  }

  // ─── Error Logs ──────────────────────────────────────────

  @Get('logs')
  @ApiOperation({ summary: 'Query error logs' })
  @ApiResponse({ status: 200, description: 'List of logs' })
  getLogs(@Query() query: QueryLogsDto) {
    return this.adminService.getLogs(query);
  }

  // ─── Audit Logs ──────────────────────────────────────────

  @Get('audit-logs')
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  listAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findMany(query);
  }

  // ─── Monitoring ──────────────────────────────────────────

  @Get('monitoring')
  @ApiOperation({ summary: 'Get system monitoring data' })
  @ApiResponse({ status: 200, description: 'Monitoring stats' })
  getMonitoring() {
    return this.adminService.getMonitoring();
  }

  // ─── System Control ──────────────────────────────────────

  @Get('system')
  @ApiOperation({ summary: 'Get system status' })
  @ApiResponse({ status: 200, description: 'System status' })
  getSystem() {
    return this.adminService.getSystem();
  }

  @Patch('system')
  @ApiOperation({
    summary: 'Update system settings (maintenance mode, global message)',
  })
  @ApiResponse({ status: 200, description: 'Updated system settings' })
  updateSystem(@Body() dto: UpdateSystemDto) {
    return this.adminService.updateSystem(dto);
  }

  // ─── Metrics ─────────────────────────────────────────────

  @Get('metrics')
  @ApiOperation({ summary: 'Get platform metrics' })
  @ApiResponse({ status: 200, description: 'Metrics data' })
  getMetrics(@Query() query: QueryMetricsDto) {
    return this.adminService.getMetrics(query);
  }
}
