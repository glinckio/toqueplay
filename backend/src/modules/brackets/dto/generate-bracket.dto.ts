import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiPropertyOptional({
    description:
      'ID da etapa. Obrigatorio em circuitos, onde cada etapa tem a propria chave. ' +
      'Em torneio unico e liga pode ser omitido: o sistema usa a unica etapa.',
  })
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiPropertyOptional({
    description:
      'Numero de grupos, usado apenas quando type = GROUPS_THEN_ELIMINATION. ' +
      'Se omitido, o numero de grupos e calculado automaticamente.',
  })
  @IsOptional()
  @IsInt()
  @Min(2)
  groupsCount?: number;
}
