import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { JORDAN_07_PHONE_MESSAGE, JORDAN_07_PHONE_REGEX } from '../../../common/validators/phone.validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiPropertyOptional({ example: '+966500000000' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @Matches(JORDAN_07_PHONE_REGEX, { message: JORDAN_07_PHONE_MESSAGE })
  phone?: string;

  @ApiPropertyOptional({ example: 'My Store' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  storeName?: string;
}
