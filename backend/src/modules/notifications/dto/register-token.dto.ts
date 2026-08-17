import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTokenDto {
  @ApiProperty({ description: 'FCM device token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Plataforma do dispositivo', example: 'android' })
  @IsString()
  @IsIn(['ios', 'android'])
  platform: string;
}
