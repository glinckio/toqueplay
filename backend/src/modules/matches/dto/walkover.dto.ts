import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WalkoverDto {
  @ApiProperty({ description: 'Time vencedor do W.O.: "A" ou "B"', example: 'A' })
  @IsString()
  @IsIn(['A', 'B'])
  winnerTeam: string;
}
