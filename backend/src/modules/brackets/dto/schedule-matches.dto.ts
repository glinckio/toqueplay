import { IsArray, IsDateString, ArrayMinSize, ArrayMaxSize, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleMatchesDto {
  @ApiProperty({
    description:
      'Datas dos dias de jogo, em ordem. O sistema distribui as partidas na ordem do ' +
      'chaveamento, respeitando quantos jogos cabem por dia.',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(120)
  @IsDateString({}, { each: true })
  dates: string[];

  @ApiPropertyOptional({ description: 'Agendar so uma categoria. Omitido, agenda todas.' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
