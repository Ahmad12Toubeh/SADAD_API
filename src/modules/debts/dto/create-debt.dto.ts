import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GuarantorInputDto {
  @ApiProperty({ example: 'أحمد محمد عبدالله' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+966501234567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InstallmentsPlanDto {
  @ApiProperty({ example: 3, minimum: 2, maximum: 24 })
  @IsInt()
  @Min(2)
  count: number;

  @ApiProperty({ enum: ['monthly', 'weekly'], example: 'monthly' })
  @IsIn(['monthly', 'weekly'])
  period: 'monthly' | 'weekly';
}

export class CreateDebtDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  customerId: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(1)
  principalAmount: number;

  @ApiPropertyOptional({ example: 'SAR', default: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: ['one_time', 'installments'], example: 'installments' })
  @IsIn(['one_time', 'installments'])
  planType: 'one_time' | 'installments';

  @ApiPropertyOptional({ example: '2026-04-10' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'مديونية جديدة (بضاعة)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'ملاحظات' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => InstallmentsPlanDto)
  installmentsPlan?: InstallmentsPlanDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasGuarantor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => GuarantorInputDto)
  guarantor?: GuarantorInputDto;
}

