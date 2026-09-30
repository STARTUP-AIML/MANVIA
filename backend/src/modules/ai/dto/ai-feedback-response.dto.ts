import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIFeedbackRating } from '../enums/ai-feedback-rating.enum.js';

export class AIFeedbackResponseDto {
  @ApiProperty({
    description: 'Internal system feedback identifier (UUID)',
    example: '3e12c589-9a74-4b5a-9321-72f8832a8de1',
  })
  public id!: string;

  @ApiProperty({
    description: 'Identifier of the AI message being evaluated',
    example: '4f89d311-b924-41d5-bc4e-28f41e57c610',
  })
  public messageId!: string;

  @ApiProperty({
    description: 'Identifier of the user who submitted the feedback',
    example: 'c64a5118-e395-46aa-b2b7-a37f597920ab',
  })
  public userId!: string;

  @ApiProperty({
    description: 'Rating outcome',
    enum: AIFeedbackRating,
    example: AIFeedbackRating.POSITIVE,
  })
  public rating!: AIFeedbackRating;

  @ApiPropertyOptional({
    description: 'Optional qualitative comment',
    nullable: true,
    example: 'Very clear explanation.',
  })
  public comment?: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-09-29T21:05:00.000Z',
  })
  public createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-09-29T21:05:00.000Z',
  })
  public updatedAt!: string;
}
