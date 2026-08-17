import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RegistrationMemberAdminDto {
  @ApiProperty()
  @IsString()
  teamMemberId: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsInt()
  isCaptain?: number; // 0 ou 1 (vindo do checkbox HTML)
}

export class CreateRegistrationAdminDto {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty({ description: 'ID do usuário responsável pela inscrição' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ enum: ['PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED', 'REJECTED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ type: [RegistrationMemberAdminDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrationMemberAdminDto)
  members: RegistrationMemberAdminDto[];
}

export class UpdateRegistrationMemberAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  isCaptain?: number;
}

export class AddRegistrationMemberAdminDto {
  @ApiProperty()
  @IsString()
  teamMemberId: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  isCaptain?: number;
}
