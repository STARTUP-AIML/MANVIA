import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: UserStatus,
    description: 'Target account status',
    example: UserStatus.SUSPENDED,
  })
  @IsNotEmpty()
  @IsEnum(UserStatus)
  public status!: UserStatus;

  @ApiProperty({
    description: 'Mandatory justification or administrative reason for this status change',
    example: 'Suspicious login attempts detected from compromised IP range',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  public reason!: string;
}
