import {
  Controller,
  Get,
  Post,
  Delete,
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('devices/token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar FCM device token' })
  async registerToken(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterTokenDto,
  ) {
    return this.notificationsService.registerToken(userId, dto.token, dto.platform);
  }

  @Delete('devices/token/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover device token' })
  async removeToken(
    @CurrentUser('id') userId: string,
    @Param('token') token: string,
  ) {
    return this.notificationsService.removeToken(userId, token);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Listar notificações do usuário' })
  async findMine(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unread') unread?: string,
  ) {
    return this.notificationsService.findMine(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      unread === 'true',
    );
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Contador de notificações não lidas' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(notificationId, userId);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Marcar todas como lidas' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
