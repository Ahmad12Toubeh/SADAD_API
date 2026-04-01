import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { CreateAssociationDto } from './create-association.dto';

export class UpdateAssociationDto extends PartialType(CreateAssociationDto) {
  @ApiProperty({ required: false, enum: ['rotating', 'family'] })
  @IsOptional()
  @IsIn(['rotating', 'family'])
  associationKind?: 'rotating' | 'family';

  @ApiProperty({ required: false })
  @IsOptional()
  fundGuarantorMemberId?: string;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentMonth?: number;
}
