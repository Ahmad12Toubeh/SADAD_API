import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: 'cash', default: 'cash' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 'سداد نقدي' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: '2026-03-30T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

