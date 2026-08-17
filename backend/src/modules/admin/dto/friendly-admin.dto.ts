import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFriendlyAdminDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  requesterId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requesterTeamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  challengedId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  challengedTeamId?: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryFormat?: string;
}

export class UpdateFriendlyAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requesterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requesterTeamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  challengedId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  challengedTeamId?: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'] })
  @IsOptional()
  @IsString()
  status?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  scoreTeamA?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  scoreTeamB?: number;
}
