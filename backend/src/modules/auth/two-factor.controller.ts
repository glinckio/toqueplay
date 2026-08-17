import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { RedisService } from '../../common/redis/redis.service';
import { AppError } from '../../common/errors/app-error';

class Verify2faDto {
  @ApiProperty({ description: 'Token TOTP de 6 dígitos ou código de backup de 8 caracteres' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(20)
  token: string;
}

class Setup2faVerifyDto {
  @ApiProperty({ description: 'Secret TOTP retornado por /me/2fa/setup' })
  @IsString()
  @IsNotEmpty()
  secret: string;

  @ApiProperty({ description: 'Primeiro token TOTP de 6 dígitos para confirmar pareamento' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  token: string;
}

@ApiTags('Two-Factor Auth (TOTP)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/2fa')
export class TwoFactorController {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Estado atual do 2FA para o usuário logado' })
  async status(@CurrentUser('id') userId: string) {
    const user = await this.authService.getUserFor2faStatus(userId);
    return {
      enabled: user.twoFactorEnabled,
      hasBackupCodes:
        Array.isArray(user.twoFactorBackupCodes) && user.twoFactorBackupCodes.length > 0,
    };
  }

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia setup TOTP — retorna secret + QR' })
  async setup(@CurrentUser() user: { id: string; email: string }) {
    return this.twoFactorService.beginSetup(user.id, user.email);
  }

  @Post('verify-setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirma setup TOTP — ativa 2FA + retorna backup codes' })
  async verifySetup(
    @CurrentUser('id') userId: string,
    @Body() dto: Setup2faVerifyDto,
  ) {
    return this.twoFactorService.verifyAndEnable(userId, dto.secret, dto.token);
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativa 2FA' })
  async disable(@CurrentUser('id') userId: string) {
    await this.twoFactorService.disable(userId);
    return { message: '2FA desativado.' };
  }
}
