import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  ValidateIf,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCpf } from '../../../common/decorators/is-cpf.decorator';

export class ConsentsDto {
  @ApiPropertyOptional({ description: 'Aceita receber notificações push (opcional)' })
  @IsOptional()
  @IsBoolean()
  notificationsPush?: boolean;

  @ApiPropertyOptional({ description: 'Aceita usar localização para descoberta (opcional)' })
  @IsOptional()
  @IsBoolean()
  locationDiscovery?: boolean;

  @ApiPropertyOptional({ description: 'Aceita receber emails de marketing (opcional)' })
  @IsOptional()
  @IsBoolean()
  marketingEmail?: boolean;
}

export class RegisterDto {
  @ApiProperty({ description: 'Nome do usuario' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Email do usuario' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'CPF do usuario (obrigatorio no cadastro).',
    example: '52998224725',
  })
  @IsCpf()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ description: 'Senha do usuario' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Confirmacao de senha' })
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o: RegisterDto) => o.password !== o.confirmPassword)
  confirmPassword: string;

  @ApiProperty({
    description: 'Aceitação obrigatória dos Termos e Política de Privacidade (LGPD).',
  })
  @IsBoolean()
  consent: boolean;

  @ApiPropertyOptional({ description: 'Consentimentos granulares opcionais' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentsDto)
  consents?: ConsentsDto;
}
