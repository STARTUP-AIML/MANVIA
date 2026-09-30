import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAIConversationDto {
  @ApiPropertyOptional({
    description: 'Optional human-readable title for the AI conversation session',
    maxLength: 255,
    example: 'Sleep and Stress Routine Guidance',
    default: 'Wellness Conversation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'title cannot exceed 255 characters' })
  public title?: string;
}
