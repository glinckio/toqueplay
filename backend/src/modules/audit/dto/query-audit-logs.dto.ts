import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAuditLogsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number = 20;

  @IsOptional() @IsString()
  action?: string;

  @IsOptional() @IsString()
  entityType?: string;

  @IsOptional() @IsString()
  actorId?: string;

  @IsOptional() @IsString()
  entityId?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsDateString()
  from?: string;

  @IsOptional() @IsDateString()
  to?: string;
}
