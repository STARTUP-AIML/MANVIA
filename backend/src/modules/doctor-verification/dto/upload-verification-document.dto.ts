import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationDocumentType } from '../enums/verification-document-type.enum.js';

export class UploadVerificationDocumentDto {
  @ApiProperty({
    description: 'Type of verification credential being uploaded',
    enum: VerificationDocumentType,
    example: VerificationDocumentType.MEDICAL_LICENSE,
  })
  @IsEnum(VerificationDocumentType)
  documentType!: VerificationDocumentType;

  @ApiProperty({
    description: 'Original name of the uploaded file',
    maxLength: 255,
    example: 'state_medical_license_2026.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFileName!: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes (maximum 10MB = 10485760 bytes)',
    example: 1048576,
  })
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  fileSizeBytes!: number;

  @ApiPropertyOptional({
    description: 'Base64-encoded document content for direct file upload',
    example: 'JVBERi0xLjQK...',
  })
  @IsOptional()
  @IsString()
  contentBase64?: string | undefined;
}
