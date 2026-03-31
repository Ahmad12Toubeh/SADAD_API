import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'محمد أحمد' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiPropertyOptional({ example: '0551234567' })
  @IsOptional()
  @IsString()
  phone?: string;
}

