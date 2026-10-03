import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIFeedbackRating } from '../enums/ai-feedback-rating.enum.js';

export class SubmitAIFeedbackDto {
  @ApiProperty({
    description: 'User sentiment rating for the specific AI assistant response',
    enum: AIFeedbackRating,
    example: AIFeedbackRating.POSITIVE,
  })
  @IsEnum(AIFeedbackRating, {
    message: 'rating must be either POSITIVE or NEGATIVE',
  })
  public rating!: AIFeedbackRating;

  @ApiPropertyOptional({
    description: 'Optional qualitative comment explaining user feedback',
    maxLength: 1000,
    example: 'The response provided helpful, practical sleep hygiene steps.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'comment cannot exceed 1000 characters' })
  public comment?: string;
}
