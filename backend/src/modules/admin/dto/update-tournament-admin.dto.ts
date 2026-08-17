import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateTournamentCategoryDto {
  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'MIX'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ['PAIR', 'QUARTET', 'SEXTET'] })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ enum: ['BEACH', 'COURT'] })
  @IsOptional()
  @IsString()
  modality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minMembers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxMembers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bestOfSets?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tiebreakScore?: number;

  @ApiPropertyOptional({ description: 'Preço da inscrição (BRL)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  registrationPrice?: number;
}

export class UpdateTournamentStageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxTeams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateTournamentAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ enum: ['SINGLE', 'CIRCUIT'] })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    enum: [
      'DRAFT',
      'PUBLISHED',
      'REGISTRATION_OPEN',
      'REGISTRATION_CLOSED',
      'BRACKET_GENERATED',
      'IN_PROGRESS',
      'FINISHED',
      'CANCELLED',
    ],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: UpdateTournamentCategoryDto })
  @IsOptional()
  @Type(() => UpdateTournamentCategoryDto)
  category?: UpdateTournamentCategoryDto;

  @ApiPropertyOptional({ type: UpdateTournamentStageDto })
  @IsOptional()
  @Type(() => UpdateTournamentStageDto)
  stage?: UpdateTournamentStageDto;
}
