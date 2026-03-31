import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  remindOnDelay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  remindBeforeDue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customWhatsappNumber?: string;
}

