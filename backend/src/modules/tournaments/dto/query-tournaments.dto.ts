import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TournamentStatus } from '@prisma/client';

export class QueryTournamentsDto {
  @ApiPropertyOptional({ description: 'Filtrar por cidade' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status', enum: TournamentStatus })
  @IsEnum(TournamentStatus)
  @IsOptional()
  status?: TournamentStatus;

  @ApiPropertyOptional({ description: 'Filtrar por tipo (busca nas categorias)' })
  @IsString()
  @IsOptional()
  categoryType?: string;

  @ApiPropertyOptional({ description: 'Filtrar por formato (busca nas categorias)' })
  @IsString()
  @IsOptional()
  categoryFormat?: string;

  @ApiPropertyOptional({ description: 'Filtrar por modalidade (busca nas categorias)' })
  @IsString()
  @IsOptional()
  categoryModality?: string;
}
