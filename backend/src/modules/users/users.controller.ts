import { Controller, Get, Patch, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsNumber, IsOptional, IsBoolean, IsInt, Min, Max, IsIn } from 'class-validator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationPreferencesDto } from './dto/notification-preferences.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Type } from 'class-transformer';
import { Audit } from '../audit/audit.decorator';

class UpdateLocationDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enableLocationNotifications?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  @Type(() => Number)
  nearbyRadiusKm?: number;
}

class UpdateThemeDto {
  @IsIn(['dark', 'light'])
  themeMode: 'dark' | 'light';
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

  @Patch('me/theme')
  @ApiOperation({ summary: 'Salvar preferência de tema (dark/light) do usuário' })
  async updateTheme(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateThemeDto,
  ) {
    return this.usersService.updateTheme(userId, dto.themeMode);
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

  @Post('me/banner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload de banner do perfil do usuário' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadBanner(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadBanner(userId, file);
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'Perfil público de um atleta' })
  async getPublicProfile(@Param('id') userId: string) {
    return this.usersService.getPublicProfile(userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Buscar estatísticas de um atleta' })
  async getUserStats(@Param('id') userId: string) {
    return this.usersService.getUserStats(userId);
  }
}
