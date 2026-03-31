import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsOptional, IsString } from 'class-validator';

export class SendReminderDto {
  @ApiProperty({ enum: ['whatsapp', 'sms', 'email'] })
  @IsIn(['whatsapp', 'sms', 'email'])
  channel: 'whatsapp' | 'sms' | 'email';

  @ApiProperty({ required: false, description: 'Installment id to remind for' })
  @IsOptional()
  @IsMongoId()
  installmentId?: string;

  @ApiProperty({ required: false, description: 'Free-form message override (optional)' })
  @IsOptional()
  @IsString()
  message?: string;
}

