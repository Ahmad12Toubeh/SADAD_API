import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class ActivateSubscriptionDto {
  @IsMongoId()
  userId: string;

  @IsInt()
  @Min(1)
  @Max(24)
  months: number;

  @IsOptional()
  @IsString()
  planLabel?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
