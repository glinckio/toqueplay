import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PointDto {
  @ApiProperty({ description: 'Time que marcou o ponto: "A" ou "B"', example: 'A' })
  @IsString()
  @IsIn(['A', 'B'])
  team: string;
}
