import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AssociationMemberDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  turnOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  isReceiver?: boolean;
}

export class CreateAssociationDto {
  @ApiProperty({ example: 'جمعية أصدقاء الشمال' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 10, minimum: 2 })
  @IsOptional()
  @IsInt()
  @Min(2)
  members?: number;

  @ApiProperty({ example: 500, minimum: 1 })
  @IsInt()
  @Min(1)
  monthlyAmount: number;

  @ApiProperty({ required: false, enum: ['rotating', 'family'] })
  @IsOptional()
  @IsIn(['rotating', 'family'])
  associationKind?: 'rotating' | 'family';

  @ApiProperty({ required: false, type: [AssociationMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssociationMemberDto)
  membersList?: AssociationMemberDto[];
}
