import { ApiProperty } from '@nestjs/swagger';

export class UploadIntentResponseDto {
  @ApiProperty({
    description: 'Unique internal record UUID',
    example: 'd9b07384-d113-4944-9c87-8321e0028a7b',
  })
  public recordId!: string;

  @ApiProperty({
    description: 'Public, non-sequential record identifier (REC-XXXXXXXX)',
    example: 'REC-7492ABCD',
  })
  public publicRecordId!: string;

  @ApiProperty({
    description: 'Short-lived presigned upload URL to upload document buffer',
    example: 'https://vault.manvia.internal/secure-access/temp/rec_123?sig=...',
  })
  public uploadUrl!: string;

  @ApiProperty({
    description: 'Storage key where document will be stored in vault',
    example: 'vault/records/pat-01/rec-01.pdf',
  })
  public storageKey!: string;

  @ApiProperty({
    description: 'Upload window expiry in seconds',
    example: 600,
  })
  public expiresInSeconds!: number;

  @ApiProperty({
    description: 'Required HTTP headers for the presigned PUT upload',
    example: { 'Content-Type': 'application/pdf' },
  })
  public requiredHeaders!: Record<string, string>;
}
