import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DevicePlatform } from '../enums/index.js';

export class RegisterDeviceDto {
  @ApiProperty({ enum: DevicePlatform, example: DevicePlatform.ANDROID })
  @IsEnum(DevicePlatform)
  public platform!: DevicePlatform;

  @ApiProperty({ example: 'fcm-push-token-sample-xyz123' })
  @IsString()
  @IsNotEmpty()
  public pushToken!: string;

  @ApiPropertyOptional({ example: 'device-hardware-uuid-456' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  public deviceId?: string;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  public active?: boolean;
}
