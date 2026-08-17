import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BracketType } from '@prisma/client';

export class GenerateBracketDto {
  @ApiProperty({ description: 'ID da categoria do torneio' })
  @IsString()
  categoryId: string;

  @ApiProperty({
    description: 'Tipo de chaveamento',
    enum: BracketType,
    example: BracketType.SINGLE_ELIMINATION,
  })
  @IsEnum(BracketType)
  type: BracketType;
}
