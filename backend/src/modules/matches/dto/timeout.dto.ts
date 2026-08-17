import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TimeoutDto {
  @ApiPropertyOptional({ description: 'Team that called timeout: "A" or "B"', example: 'A' })
  @IsString()
  @IsOptional()
  team?: string;
}
