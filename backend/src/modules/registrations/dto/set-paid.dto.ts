import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPaidDto {
  @ApiProperty({ description: 'true = marcado como pago (CONFIRMED); false = pendente' })
  @IsBoolean()
  paid: boolean;
}
