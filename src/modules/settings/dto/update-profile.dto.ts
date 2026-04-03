import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { JORDAN_07_PHONE_MESSAGE, JORDAN_07_PHONE_REGEX } from '../../../common/validators/phone.validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Mohammed Ahmad' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiPropertyOptional({ example: '071234567' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @Matches(JORDAN_07_PHONE_REGEX, { message: JORDAN_07_PHONE_MESSAGE })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'sadad/avatars/user123/avatar_abc' })
  @IsOptional()
  @IsString()
  avatarPublicId?: string;
}
