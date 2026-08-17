import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DpoRequestType {
  ACCESS = 'ACCESS',
  PORTABILITY = 'PORTABILITY',
  RECTIFICATION = 'RECTIFICATION',
  DELETION = 'DELETION',
  COMPLAINT = 'COMPLAINT',
  OTHER = 'OTHER',
}

export class CreateDpoRequestDto {
  @ApiProperty({ enum: DpoRequestType })
  @IsEnum(DpoRequestType)
  type: DpoRequestType;

  @ApiProperty({ description: 'Assunto curto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ description: 'Descrição detalhada' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ description: 'Email (se não autenticado)' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateSecurityIncidentDto {
  @ApiProperty({ description: 'Tipo do incidente (ex.: data_leak, unauthorized_access)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type: string;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiProperty({ description: 'Número estimado de usuários afetados', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  affectedUsers: number;

  @ApiPropertyOptional({ description: 'Detalhamento do incidente' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Quem/fonte detectou o incidente' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  detectedBy?: string;

  @ApiPropertyOptional({
    description: 'Categorias de dados afetados (ex.: CPF, email, pix)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  affectedDataCategories?: string[];

  @ApiPropertyOptional({ description: 'Causa raiz identificada' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Medidas de contenção aplicadas' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  containmentMeasures?: string;

  @ApiPropertyOptional({ description: 'Notas adicionais' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class UpdateSecurityIncidentDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] })
  @IsOptional()
  @IsEnum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'])
  status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({ description: 'Número estimado de usuários afetados' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  affectedUsers?: number;

  @ApiPropertyOptional({ description: 'Detalhamento do incidente' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Quem/fonte detectou o incidente' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  detectedBy?: string;

  @ApiPropertyOptional({ description: 'Categorias de dados afetados' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  affectedDataCategories?: string[];

  @ApiPropertyOptional({ description: 'Causa raiz identificada' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Medidas de contenção aplicadas' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  containmentMeasures?: string;

  @ApiPropertyOptional({ description: 'Notas adicionais' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Se a ANPD foi notificada (art. 48)' })
  @IsOptional()
  @IsBoolean()
  anpdNotified?: boolean;
}

export class UpdateDpoRequestStatusDto {
  @ApiProperty({ enum: ['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'] })
  @IsEnum(['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'])
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
}
