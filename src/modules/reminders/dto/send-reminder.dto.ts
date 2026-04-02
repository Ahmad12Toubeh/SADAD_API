import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsOptional, IsString } from 'class-validator';

export class SendReminderDto {
  @ApiProperty({ enum: ['whatsapp', 'email'] })
  @IsIn(['whatsapp', 'email'])
  channel: 'whatsapp' | 'email';

  @ApiProperty({ required: false, description: 'Installment id to remind for' })
  @IsOptional()
  @IsMongoId()
  installmentId?: string;

  @ApiProperty({ required: false, description: 'Debt id to auto-pick next unpaid installment for reminder' })
  @IsOptional()
  @IsMongoId()
  debtId?: string;

  @ApiProperty({ required: false, description: 'Free-form message override (optional)' })
  @IsOptional()
  @IsString()
  message?: string;
}
