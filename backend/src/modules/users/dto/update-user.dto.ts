import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
