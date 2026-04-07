import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  code: string;

  @ApiProperty({ example: 'newStrongPassword123' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
