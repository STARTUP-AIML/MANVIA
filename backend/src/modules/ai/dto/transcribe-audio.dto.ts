import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TranscribeAudioDto {
  @ApiProperty({
    description: 'Base64-encoded audio stream (webm, wav, mp3, m4a, ogg)',
    example: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwE...',
  })
  @IsString({ message: 'audioBase64 must be a string' })
  @IsNotEmpty({ message: 'audioBase64 cannot be empty' })
  public audioBase64!: string;

  @ApiPropertyOptional({
    description: 'Audio MIME type (default audio/webm)',
    example: 'audio/webm',
    default: 'audio/webm',
  })
  @IsOptional()
  @IsString({ message: 'mimeType must be a string' })
  @MaxLength(100, { message: 'mimeType cannot exceed 100 characters' })
  public mimeType?: string;
}
