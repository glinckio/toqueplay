import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyLogin2faDto {
  @ApiProperty({
    description:
      'Temporary token returned by /auth/login when twoFactorRequired is true',
  })
  @IsString()
  @IsNotEmpty()
  temporaryToken: string;

  @ApiProperty({
    description:
      '6-digit TOTP code OR 8-char backup code (case-insensitive hex)',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 8)
  code: string;
}
