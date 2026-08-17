import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSystemDto {
  @ApiPropertyOptional({ description: 'Toggle maintenance mode' })
  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;

  @ApiPropertyOptional({ description: 'Global message to display' })
  @IsString()
  @IsOptional()
  globalMessage?: string;
}
