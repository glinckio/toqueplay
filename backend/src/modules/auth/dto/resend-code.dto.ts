import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendCodeDto {
  @ApiProperty({ description: 'Email do usuario' })
  @IsEmail()
  email: string;
}
