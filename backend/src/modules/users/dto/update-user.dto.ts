import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const HEX_COLOR_OR_EMPTY = /^$|^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Nome do usuário' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Telefone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Bio/descrição' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  bio?: string;

  @ApiPropertyOptional({ description: 'URL do avatar' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Cor customizada do nome (hex, ex: #C6F82A)' })
  @IsString()
  @IsOptional()
  @Matches(HEX_COLOR_OR_EMPTY, { message: 'nameColor deve ser uma cor hex válida' })
  nameColor?: string;

  @ApiPropertyOptional({ description: 'Cor customizada do e-mail (hex, ex: #7C3AED)' })
  @IsString()
  @IsOptional()
  @Matches(HEX_COLOR_OR_EMPTY, { message: 'emailColor deve ser uma cor hex válida' })
  emailColor?: string;
}
