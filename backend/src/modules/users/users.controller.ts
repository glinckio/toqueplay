import { Controller, Get, Patch, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile, HttpStatus, HttpCode, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationPreferencesDto } from './dto/notification-preferences.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Type } from 'class-transformer';
import { Audit } from '../audit/audit.decorator';

class UpdateLocationDto {
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enableLocationNotifications?: boolean;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil do usuário logado' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Estatísticas do usuário logado' })
  async getMyStats(@CurrentUser('id') userId: string) {
    return this.usersService.getUserStats(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil' })
  @Audit('USER_PROFILE_UPDATED', 'User', {
    fetchBefore: async (prisma, id) => prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, phone: true, bio: true, avatarUrl: true } }),
  })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/location')
  @ApiOperation({ summary: 'Atualizar localização do usuário' })
  async updateLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.usersService.updateLocation(userId, dto);
  }

  @Get('me/notification-preferences')
  @ApiOperation({ summary: 'Buscar preferências de notificação' })
  async getNotificationPreferences(@CurrentUser('id') userId: string) {
    return this.usersService.getNotificationPreferences(userId);
  }

  @Patch('me/notification-preferences')
  @ApiOperation({ summary: 'Atualizar preferências de notificação' })
  async updateNotificationPreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: NotificationPreferencesDto,
  ) {
    return this.usersService.updateNotificationPreferences(userId, dto);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload de avatar do usuário' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(userId, file);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Buscar estatísticas de um atleta (apenas próprio usuário ou SUPER_ADMIN)' })
  async getUserStats(
    @Param('id') userId: string,
    @CurrentUser() requester: { id: string; role: string },
  ) {
    if (requester.id !== userId && requester.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Acesso negado às estatísticas de outro usuário');
    }
    return this.usersService.getUserStats(userId);
  }
}
