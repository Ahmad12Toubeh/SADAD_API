import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Mohammed Ahmad' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiPropertyOptional({ example: '0791234567' })
  @IsOptional()
  @IsString()
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
