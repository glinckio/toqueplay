import { IsString, IsNotEmpty, IsOptional, MaxLength, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VolleyballPosition } from '@prisma/client';
import { IsCpf } from '../../../common/decorators/is-cpf.decorator';

export class AddGuestDto {
  @ApiProperty({ description: 'Nome do convidado' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  guestName: string;

  @ApiPropertyOptional({ description: 'CPF do convidado (apenas numeros)' })
  @IsOptional()
  @IsCpf()
  cpf?: string;

  @ApiPropertyOptional({
    description: 'Posicoes do atleta',
    enum: VolleyballPosition,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(VolleyballPosition, { each: true })
  positions?: VolleyballPosition[];
}
