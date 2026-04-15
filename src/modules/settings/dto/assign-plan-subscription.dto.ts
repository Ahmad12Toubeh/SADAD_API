import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class AssignPlanSubscriptionDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  planId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

