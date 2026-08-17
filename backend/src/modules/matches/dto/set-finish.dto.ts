import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SetFinishDto {
  @ApiProperty({ description: 'Número do set a finalizar', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  setNumber: number;
}
