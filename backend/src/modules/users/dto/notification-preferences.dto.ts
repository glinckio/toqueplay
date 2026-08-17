import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class NotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Notificações de mensagens' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  messages?: boolean;

  @ApiPropertyOptional({ description: 'Notificações de convites' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  invites?: boolean;

  @ApiPropertyOptional({ description: 'Notificações de partidas' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  matches?: boolean;

  @ApiPropertyOptional({ description: 'Notificações de amistosos' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  friendlies?: boolean;

  @ApiPropertyOptional({ description: 'Notificações de torneios' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  tournaments?: boolean;
}
