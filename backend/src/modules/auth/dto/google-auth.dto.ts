import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token obtido via Google Sign-In' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
