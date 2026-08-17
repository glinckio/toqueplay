import { IsEmail, IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email do usuario' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Codigo de verificacao de 6 digitos' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
