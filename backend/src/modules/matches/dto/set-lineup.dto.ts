import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LineupPositionDto {
  @ApiProperty({ description: 'Posição na quadra (1-6)', example: 1 })
  @IsInt()
  @Min(1)
  @Max(6)
  position: number;

  @ApiProperty({ description: 'ID do membro do time nessa posição' })
  @IsUUID()
  teamMemberId: string;
}

export class SetLineupDto {
  @ApiProperty({ description: 'Numero do set' })
  @IsInt()
  @Min(1)
  setNumber: number;

  @ApiProperty({ description: 'Time: "A" ou "B"', example: 'A' })
  @IsIn(['A', 'B'])
  team: string;

  @ApiProperty({ description: 'Escalação por posição (1-6)', type: [LineupPositionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineupPositionDto)
  positions: LineupPositionDto[];
}
