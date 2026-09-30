import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_MESSAGE_CONTENT_LENGTH } from '../constants/ai.constants.js';

export class SendAIMessageDto {
  @ApiProperty({
    description: 'The user message text to submit to the AI Companion',
    maxLength: MAX_MESSAGE_CONTENT_LENGTH,
    example: 'How can I improve my sleep routine naturally?',
  })
  @IsString({ message: 'content must be a string' })
  @IsNotEmpty({ message: 'content cannot be empty' })
  @MaxLength(MAX_MESSAGE_CONTENT_LENGTH, {
    message: `content cannot exceed ${MAX_MESSAGE_CONTENT_LENGTH} characters`,
  })
  public content!: string;

  @ApiPropertyOptional({
    description: 'Optional preferred user language or locale code for response formatting',
    example: 'en-US',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32, { message: 'locale cannot exceed 32 characters' })
  public locale?: string;
}
