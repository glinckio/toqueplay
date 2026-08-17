import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationStatus } from '@prisma/client';

export class QueryRegistrationsDto {
  @ApiPropertyOptional({ description: 'Filtrar por status', enum: RegistrationStatus })
  @IsEnum(RegistrationStatus)
  @IsOptional()
  status?: RegistrationStatus;

  @ApiPropertyOptional({ description: 'Filtrar por categoria' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
