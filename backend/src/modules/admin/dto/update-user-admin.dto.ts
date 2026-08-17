import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: ['ATLETA', 'ORGANIZADOR', 'SUPER_ADMIN'] })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'BLOCKED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Telefone (qualquer formato)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Redefine senha (se enviada)' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
