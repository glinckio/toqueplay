import { IsUUID, IsArray, ArrayUnique, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTeamDto {
  @ApiProperty({ description: 'ID do time' })
  @IsUUID()
  teamId: string;

  @ApiProperty({ description: 'ID da categoria' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: 'IDs dos membros selecionados para jogar' })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique()
  memberIds: string[];

  @ApiProperty({ description: 'ID do membro que será capitão nesta inscrição', required: false })
  @IsOptional()
  @IsUUID()
  captainMemberId?: string;
}
