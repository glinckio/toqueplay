import { IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptFriendlyDto {
  @ApiProperty({ description: 'IDs dos atletas do time desafiado (teamMemberIds)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  athleteIds: string[];

  @ApiPropertyOptional({ description: 'ID do capitão entre os atletas (teamMemberId)' })
  @IsString()
  @IsOptional()
  captainId?: string;
}
