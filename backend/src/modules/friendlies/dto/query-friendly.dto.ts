import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryFriendlyDto {
  @ApiPropertyOptional({ description: 'Filtrar por status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filtrar por cidade' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Filtrar por data (a partir de)' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filtrar por data (até)' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}

export class NearbyQueryDto {
  @ApiPropertyOptional({ description: 'Latitude' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Raio em km' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  radius?: number;
}
