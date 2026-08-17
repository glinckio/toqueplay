import { IsString, IsOptional, IsDateString, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFriendlyDto {
  @ApiPropertyOptional({ description: 'Titulo do amistoso' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Descricao' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID do time desafiante' })
  @IsString()
  @IsOptional()
  requesterTeamId?: string;

  @ApiPropertyOptional({ description: 'ID do usuario desafiado' })
  @IsString()
  @IsOptional()
  challengedId?: string;

  @ApiPropertyOptional({ description: 'ID do time desafiado' })
  @IsString()
  @IsOptional()
  challengedTeamId?: string;

  @ApiProperty({ description: 'Data do amistoso' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Horario de inicio' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Endereco' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Numero do endereco' })
  @IsString()
  @IsOptional()
  addressNumber?: string;

  @ApiPropertyOptional({ description: 'Cidade' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Estado' })
  @IsString()
  @IsOptional()
  state?: string;

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

  @ApiPropertyOptional({ description: 'Raio de abrangencia (km)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  regionRadius?: number;

  @ApiPropertyOptional({ description: 'Modalidade (BEACH ou COURT)' })
  @IsString()
  @IsOptional()
  modality?: string;

  @ApiPropertyOptional({ description: 'Formato da categoria (PAIR, QUARTET, SEXTET)' })
  @IsString()
  @IsOptional()
  categoryFormat?: string;

  @ApiPropertyOptional({ description: 'IDs dos atletas (teamMemberIds)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  athleteIds?: string[];

  @ApiPropertyOptional({ description: 'ID do capitão entre os atletas (teamMemberId)' })
  @IsString()
  @IsOptional()
  captainId?: string;
}
