import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email do usuario' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Senha do usuario' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
