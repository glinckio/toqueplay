import { IsOptional, IsString, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExploreQueryDto {
  @ApiPropertyOptional({ description: 'Busca textual pelo nome' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo (MALE, FEMALE, MIX)' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filtrar por formato (PAIR, QUARTET, SEXTET)' })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiPropertyOptional({ description: 'Filtrar por modalidade (BEACH, COURT)' })
  @IsString()
  @IsOptional()
  modality?: string;

  @ApiPropertyOptional({ description: 'Filtrar por cidade' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Latitude para busca por proximidade' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude para busca por proximidade' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Raio em km para busca por proximidade', default: 50 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  radius?: number;

  @ApiPropertyOptional({ description: 'Filtrar por status do torneio' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Data mínima (a partir de)' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Data máxima (até)' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Preço mínimo' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Preço máximo' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  priceMax?: number;

  @ApiPropertyOptional({ description: 'Cursor para paginação (ID do último item)' })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Limite de itens por página', default: 20 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
