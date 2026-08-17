import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SponsorItemDto {
  @ApiProperty({ description: 'Nome do patrocinador' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ description: 'URL do logo' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Descricao' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class AddSponsorsDto {
  @ApiProperty({ description: 'Lista de patrocinadores', type: [SponsorItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SponsorItemDto)
  sponsors: SponsorItemDto[];
}
