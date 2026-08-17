import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryLogsDto {
  @ApiPropertyOptional({
    description: 'Filter by log level (INFO, WARN, ERROR)',
  })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiPropertyOptional({ description: 'Filter by source module' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'From date (ISO string)' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'To date (ISO string)' })
  @IsDateString()
  @IsOptional()
  to?: string;
}
