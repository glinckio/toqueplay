import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMetricsDto {
  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsDateString()
  @IsOptional()
  to?: string;
}
