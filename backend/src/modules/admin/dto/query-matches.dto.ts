import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryAdminMatchesDto {
  @ApiPropertyOptional({ description: 'Filter by match status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Tipo: tournament (chave de torneio) ou friendly (amistoso)',
    enum: ['tournament', 'friendly'],
  })
  @IsOptional()
  @IsIn(['tournament', 'friendly'])
  type?: 'tournament' | 'friendly';

  @ApiPropertyOptional({ description: 'Filter by tournament id (via bracket)' })
  @IsString()
  @IsOptional()
  tournamentId?: string;

  @ApiPropertyOptional({ description: 'Filter by friendly id' })
  @IsString()
  @IsOptional()
  friendlyId?: string;

  @ApiPropertyOptional({
    description: 'Filter matches scheduled from this date (ISO)',
  })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    description: 'Filter matches scheduled up to this date (ISO)',
  })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
