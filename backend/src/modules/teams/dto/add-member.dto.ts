import { IsEmail, IsOptional, IsArray, IsEnum, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VolleyballPosition } from '@prisma/client';
import { IsCpf } from '../../../common/decorators/is-cpf.decorator';

/**
 * O convite aceita e-mail OU CPF: o dono do time nem sempre sabe com qual e-mail o atleta se
 * cadastrou, e o CPF e obrigatorio e unico no cadastro. Quando os dois vem, o e-mail ganha.
 *
 * O `ValidateIf` cruzado exige pelo menos um: sem CPF o e-mail precisa ser valido (e `undefined`
 * reprova no `IsEmail`), sem e-mail o CPF precisa ser valido. Payload vazio reprova nos dois.
 *
 * Nao existe `isCaptain` aqui de proposito: este endpoint cria um `TeamInvitation`, nao um
 * `TeamMember` — quem vira membro (e com qual flag) e o `acceptInvitation`.
 */
export class AddMemberDto {
  @ApiPropertyOptional({ description: 'Email do usuario a convidar (ou informe o CPF)' })
  @ValidateIf((dto: AddMemberDto) => !dto.cpf)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'CPF do usuario a convidar, apenas numeros (ou informe o email)' })
  @ValidateIf((dto: AddMemberDto) => !dto.email)
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
