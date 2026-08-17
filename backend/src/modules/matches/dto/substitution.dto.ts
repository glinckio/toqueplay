import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubstitutionDto {
  @ApiProperty({ description: 'ID do time que fez a substituição' })
  @IsUUID()
  teamId: string;

  @ApiPropertyOptional({ description: 'ID do jogador que saiu (praia: omitido, é só informativo)' })
  @IsOptional()
  @IsUUID()
  playerOutId?: string;

  @ApiPropertyOptional({ description: 'ID do jogador que entrou (praia: omitido, é só informativo)' })
  @IsOptional()
  @IsUUID()
  playerInId?: string;
}
