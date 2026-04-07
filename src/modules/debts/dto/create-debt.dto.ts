import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { JORDAN_07_PHONE_MESSAGE, JORDAN_07_PHONE_REGEX } from '../../../common/validators/phone.validator';

export class GuarantorInputDto {
  @ApiProperty({ example: 'Ahmed Abdullah' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+962791234567' })
  @IsString()
  @Matches(JORDAN_07_PHONE_REGEX, { message: JORDAN_07_PHONE_MESSAGE })
  phone: string;

  @ApiPropertyOptional({ example: 'Optional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../guarantor-id.jpg' })
  @IsOptional()
  @IsString()
  proofImageUrl?: string;

  @ApiPropertyOptional({ example: 'sadad/guarantors/user123/image_abc' })
  @IsOptional()
  @IsString()
  proofImagePublicId?: string;
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

  @ApiPropertyOptional({ example: 500, description: 'Amount paid upfront when creating debt' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialPaymentAmount?: number;

  @ApiPropertyOptional({ enum: ['invoice', 'loan', 'other'], example: 'invoice' })
  @IsOptional()
  @IsIn(['invoice', 'loan', 'other'])
  type?: 'invoice' | 'loan' | 'other';

  @ApiPropertyOptional({ example: 'JOD', default: 'JOD' })
  @IsOptional()
  @IsIn(['JOD'])
  currency?: string;

  @ApiProperty({ enum: ['one_time', 'installments'], example: 'installments' })
  @IsIn(['one_time', 'installments'])
  planType: 'one_time' | 'installments';

  @ApiPropertyOptional({ example: '2026-04-10' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'New debt (inventory)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Optional notes' })
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
