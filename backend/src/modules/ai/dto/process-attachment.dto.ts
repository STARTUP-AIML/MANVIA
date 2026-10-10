import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessAttachmentDto {
  @ApiProperty({
    description: 'Name of the attached file',
    maxLength: 255,
    example: 'daily_health_journal.txt',
  })
  @IsString({ message: 'fileName must be a string' })
  @IsNotEmpty({ message: 'fileName cannot be empty' })
  @MaxLength(255, { message: 'fileName cannot exceed 255 characters' })
  public fileName!: string;

  @ApiProperty({
    description: 'MIME type of the attachment',
    maxLength: 100,
    example: 'text/plain',
  })
  @IsString({ message: 'mimeType must be a string' })
  @IsNotEmpty({ message: 'mimeType cannot be empty' })
  @MaxLength(100, { message: 'mimeType cannot exceed 100 characters' })
  public mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes (maximum 5MB = 5242880 bytes)',
    example: 1024,
  })
  @IsInt({ message: 'fileSizeBytes must be an integer' })
  @Min(1, { message: 'fileSizeBytes must be at least 1 byte' })
  @Max(5 * 1024 * 1024, { message: 'fileSizeBytes cannot exceed 5MB' })
  public fileSizeBytes!: number;

  @ApiProperty({
    description: 'Base64-encoded file content',
    example: 'U2xlZXAgc2NoZWR1bGU6IDEwcG0gdG8gNmFtLi4u',
  })
  @IsString({ message: 'contentBase64 must be a string' })
  @IsNotEmpty({ message: 'contentBase64 cannot be empty' })
  public contentBase64!: string;
}
