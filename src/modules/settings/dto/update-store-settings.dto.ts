import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateStoreSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cr?: string;

  @ApiPropertyOptional({ example: 'JOD' })
  @IsOptional()
  @IsString()
  currency?: string;
}
