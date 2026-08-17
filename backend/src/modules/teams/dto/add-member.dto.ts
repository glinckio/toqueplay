import { IsEmail, IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VolleyballPosition } from '@prisma/client';
import { IsCpf } from '../../../common/decorators/is-cpf.decorator';

export class AddMemberDto {
  @ApiProperty({ description: 'Email do usuario a adicionar' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'CPF do membro (apenas numeros)' })
  @IsOptional()
  @IsCpf()
  cpf?: string;

  @ApiPropertyOptional({ description: 'Se o membro e capitao' })
  @IsOptional()
  isCaptain?: boolean;

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
