import { IsArray, IsInt, Min, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PointsRuleDto {
  @ApiProperty({ description: 'Colocacao. 1 = campeao. Vale ate a proxima colocacao da tabela.' })
  @IsInt()
  @Min(1)
  placement: number;

  @ApiProperty({ description: 'Pontos que essa colocacao vale' })
  @IsInt()
  @Min(0)
  points: number;
}

export class UpdatePointsRulesDto {
  @ApiProperty({ type: [PointsRuleDto], description: 'Substitui a tabela inteira' })
  @IsArray()
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => PointsRuleDto)
  rules: PointsRuleDto[];
}
