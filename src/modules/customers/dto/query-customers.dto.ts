import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryCustomersDto {
  @ApiPropertyOptional({ example: 'أحمد' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['regular', 'late', 'defaulting'] })
  @IsOptional()
  @IsIn(['regular', 'late', 'defaulting'])
  status?: 'regular' | 'late' | 'defaulting';

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

