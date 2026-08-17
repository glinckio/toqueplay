import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  IsDateString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTournamentCategoryAdminDto {
  @ApiProperty({ enum: ['MALE', 'FEMALE', 'MIX'] })
  @IsString()
  type: string;

  @ApiProperty({ enum: ['PAIR', 'QUARTET', 'SEXTET'] })
  @IsString()
  format: string;

  @ApiProperty({ enum: ['BEACH', 'COURT'] })
  @IsString()
  modality: string;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minMembers?: number;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxMembers?: number;

  @ApiPropertyOptional({ default: 3 })
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

  @ApiPropertyOptional({ description: 'Preço BRL' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  registrationPrice?: number;

  @ApiPropertyOptional({ enum: ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'GROUPS_THEN_ELIMINATION'] })
  @IsOptional()
  @IsString()
  bracketType?: string;
}

export class CreateTournamentStageAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ default: 16 })
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

export class CreateTournamentAdminDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'ID do usuário organizador' })
  @IsString()
  ownerId: string;

  @ApiPropertyOptional({ enum: ['SINGLE', 'CIRCUIT'], default: 'SINGLE' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN'], default: 'DRAFT' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiProperty({ type: CreateTournamentCategoryAdminDto })
  @Type(() => CreateTournamentCategoryAdminDto)
  category: CreateTournamentCategoryAdminDto;

  @ApiProperty({ type: CreateTournamentStageAdminDto })
  @Type(() => CreateTournamentStageAdminDto)
  stage: CreateTournamentStageAdminDto;
}
