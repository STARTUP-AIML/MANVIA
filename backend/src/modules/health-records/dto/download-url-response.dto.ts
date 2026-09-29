import { ApiProperty } from '@nestjs/swagger';

export class DownloadUrlResponseDto {
  @ApiProperty({
    description: 'Unique internal record UUID',
    example: 'd9b07384-d113-4944-9c87-8321e0028a7b',
  })
  public recordId!: string;

  @ApiProperty({
    description: 'Public record identifier (REC-XXXXXXXX)',
    example: 'REC-7492ABCD',
  })
  public publicRecordId!: string;

  @ApiProperty({
    description: 'Short-lived time-limited signed URL to download document from secure vault',
    example: 'https://vault.manvia.internal/secure-access/records/rec_123.pdf?sig=...',
  })
  public downloadUrl!: string;

  @ApiProperty({
    description: 'Validity window of download URL in seconds',
    example: 300,
  })
  public expiresInSeconds!: number;
}
