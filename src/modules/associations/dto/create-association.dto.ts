import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateAssociationDto {
  @ApiProperty({ example: 'جمعية أصدقاء الشمال' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 10, minimum: 2 })
  @IsInt()
  @Min(2)
  members: number;

  @ApiProperty({ example: 500, minimum: 1 })
  @IsInt()
  @Min(1)
  monthlyAmount: number;

  @ApiProperty({ example: 7, minimum: 1 })
  @IsInt()
  @Min(1)
  myTurn: number;
}

