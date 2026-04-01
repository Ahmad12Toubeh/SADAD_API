import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CustomerStatus, CustomerType } from '../schemas/customer.schema';

export class CreateCustomerDto {
  @ApiProperty({ enum: ['individual', 'company'], example: 'individual' })
  @IsIn(['individual', 'company'])
  type: CustomerType;

  @ApiProperty({ example: 'Horizon Limited' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '0551234567' })
  @IsString()
  @MinLength(7)
  phone: string;

  @ApiPropertyOptional({ example: 'info@horizon.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Riyadh, Olaya district' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '1010XXXXXX' })
  @IsOptional()
  @IsString()
  cr?: string;

  @ApiPropertyOptional({ example: 'Important customer' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ['regular', 'late', 'defaulting'], example: 'regular' })
  @IsOptional()
  @IsIn(['regular', 'late', 'defaulting'])
  status?: CustomerStatus;
}
