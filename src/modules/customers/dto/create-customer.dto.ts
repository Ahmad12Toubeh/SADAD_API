import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { CustomerStatus, CustomerType } from '../schemas/customer.schema';
import { JORDAN_07_PHONE_MESSAGE, JORDAN_07_PHONE_REGEX } from '../../../common/validators/phone.validator';

export class CreateCustomerDto {
  @ApiProperty({ enum: ['individual', 'company'], example: 'individual' })
  @IsIn(['individual', 'company'])
  type: CustomerType;

  @ApiProperty({ example: 'Horizon Limited' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '0551234567' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(JORDAN_07_PHONE_REGEX, { message: JORDAN_07_PHONE_MESSAGE })
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

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../customer-id.jpg' })
  @IsOptional()
  @IsString()
  proofImageUrl?: string;

  @ApiPropertyOptional({ example: 'sadad/customers/user123/image_abc' })
  @IsOptional()
  @IsString()
  proofImagePublicId?: string;

  @ApiPropertyOptional({ enum: ['regular', 'late', 'defaulting'], example: 'regular' })
  @IsOptional()
  @IsIn(['regular', 'late', 'defaulting'])
  status?: CustomerStatus;
}
