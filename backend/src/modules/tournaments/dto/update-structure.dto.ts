import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TournamentType,
  TournamentFormat,
  TournamentModality,
  TournamentEventType,
  BracketType,
} from '@prisma/client';

export class FacilityDto {
  @ApiProperty({ description: 'Nome da facility' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Disponivel' })
  @IsBoolean()
  @IsOptional()
  available?: boolean;
}

export class StageDto {
  @ApiPropertyOptional({ description: 'Nome da etapa' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'Data da etapa' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Horario de inicio' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Maximo de times na etapa' })
  @IsInt()
  @IsOptional()
  @Min(2)
  maxTeams?: number;

  @ApiPropertyOptional({ description: 'Endereco da etapa' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ description: 'Rua' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  street?: string;

  @ApiPropertyOptional({ description: 'Numero' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  number?: string;

  @ApiPropertyOptional({ description: 'Bairro' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  neighborhood?: string;

  @ApiPropertyOptional({ description: 'CEP' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  cep?: string;

  @ApiPropertyOptional({ description: 'Cidade da etapa' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Estado da etapa' })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  state?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Raio de abrangencia em km' })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(500)
  regionRadius?: number;

  @ApiPropertyOptional({ description: 'Facilities da etapa', type: [FacilityDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FacilityDto)
  facilities?: FacilityDto[];
}

export class CategoryDto {
  @ApiProperty({ description: 'Tipo', enum: TournamentType })
  @IsEnum(TournamentType)
  type: TournamentType;

  @ApiProperty({ description: 'Formato', enum: TournamentFormat })
  @IsEnum(TournamentFormat)
  format: TournamentFormat;

  @ApiProperty({ description: 'Modalidade', enum: TournamentModality })
  @IsEnum(TournamentModality)
  modality: TournamentModality;

  @ApiPropertyOptional({ description: 'Minimo de membros por time' })
  @IsInt()
  @IsOptional()
  @Min(1)
  minMembers?: number;

  @ApiPropertyOptional({ description: 'Maximo de membros por time' })
  @IsInt()
  @IsOptional()
  @Min(1)
  maxMembers?: number;

  @ApiPropertyOptional({ description: 'Melhor de quantos sets (padrao 3)' })
  @IsInt()
  @IsOptional()
  @Min(1)
  bestOfSets?: number;

  @ApiPropertyOptional({ description: 'Melhor de quantos sets na semifinal (se nao informado, usa bestOfSets)' })
  @IsInt()
  @IsOptional()
  @Min(1)
  semifinalBestOfSets?: number;

  @ApiPropertyOptional({ description: 'Melhor de quantos sets na final (se nao informado, usa bestOfSets)' })
  @IsInt()
  @IsOptional()
  @Min(1)
  finalBestOfSets?: number;

  @ApiPropertyOptional({ description: 'Pontuacao do set de desempate/tiebreak (padrao: 15 para quadra, 15 para praia). Se nao informado, usa o score padrao da modalidade.' })
  @IsInt()
  @IsOptional()
  @Min(1)
  tiebreakScore?: number;

  @ApiPropertyOptional({ description: 'Horario de inicio' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Preco da inscricao' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  registrationPrice?: number;

  @ApiPropertyOptional({ description: 'Prazo de inscricao' })
  @IsDateString()
  @IsOptional()
  registrationDeadline?: string;

  @ApiPropertyOptional({ description: 'Regras de inscricao' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  registrationRules?: string;

  @ApiPropertyOptional({ description: 'Criterios de desempate ordenados', example: ['WINS', 'POINT_DIFF', 'POINTS_SCORED', 'HEAD_TO_HEAD'] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tiebreakerCriteria?: string[];

  @ApiPropertyOptional({ description: 'Tipo de chaveamento', enum: BracketType })
  @IsEnum(BracketType)
  @IsOptional()
  bracketType?: BracketType;

  @ApiPropertyOptional({ description: 'Numero de grupos (para GROUPS_THEN_ELIMINATION)' })
  @IsInt()
  @IsOptional()
  @Min(2)
  groupsCount?: number;

  @ApiPropertyOptional({ description: 'Times por grupo (para GROUPS_THEN_ELIMINATION). Se definido, groupsCount e calculado automaticamente.' })
  @IsInt()
  @IsOptional()
  @Min(2)
  teamsPerGroup?: number;

  @ApiPropertyOptional({ description: 'Times que avancam por grupo (para GROUPS_THEN_ELIMINATION)' })
  @IsInt()
  @IsOptional()
  @Min(1)
  teamsAdvancing?: number;
}

export class UpdateStructureDto {
  @ApiProperty({ description: 'Tipo de evento', enum: TournamentEventType })
  @IsEnum(TournamentEventType)
  eventType: TournamentEventType;

  @ApiPropertyOptional({ description: 'Etapas (obrigatorio se CIRCUIT)', type: [StageDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StageDto)
  stages?: StageDto[];

  @ApiPropertyOptional({ description: 'Categorias', type: [CategoryDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  categories?: CategoryDto[];
}
