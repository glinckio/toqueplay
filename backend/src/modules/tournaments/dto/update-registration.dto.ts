import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRegistrationDto {
  @ApiPropertyOptional({ description: 'Maximo de times' })
  @IsInt()
  @IsOptional()
  @Min(2)
  maxTeams?: number;

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
}
