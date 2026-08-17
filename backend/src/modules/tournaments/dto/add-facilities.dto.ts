import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class FacilityItemDto {
  @ApiProperty({ description: 'Nome da facility' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Disponivel' })
  @IsBoolean()
  @IsOptional()
  available?: boolean;
}

export class AddFacilitiesDto {
  @ApiProperty({ description: 'Lista de facilities', type: [FacilityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacilityItemDto)
  facilities: FacilityItemDto[];
}
