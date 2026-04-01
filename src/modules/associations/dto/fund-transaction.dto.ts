import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FundTransactionDto {
  @ApiProperty({ enum: ['in', 'out'] })
  @IsIn(['in', 'out'])
  type: 'in' | 'out';

  @ApiProperty({ example: 500, minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  memberId?: string;
}

export class ApproveFundTransactionDto {
  @ApiProperty()
  @IsString()
  transactionId: string;

  @ApiProperty()
  @IsString()
  memberId: string;
}
