import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIConversationStatus } from '../enums/ai-conversation-status.enum.js';

export class AIConversationResponseDto {
  @ApiProperty({
    description: 'Internal system identifier (UUID)',
    example: '8a95d712-421b-4fa8-9e67-d86ea529bfa1',
  })
  public id!: string;

  @ApiProperty({
    description: 'Client-facing non-sequential identifier for the conversation session',
    example: 'AIC-7X9B2K5M',
  })
  public publicConversationId!: string;

  @ApiProperty({
    description: 'User ID of the conversation owner',
    example: 'c64a5118-e395-46aa-b2b7-a37f597920ab',
  })
  public userId!: string;

  @ApiProperty({
    description: 'Conversation title',
    example: 'Sleep and Stress Routine Guidance',
  })
  public title!: string;

  @ApiProperty({
    description: 'Conversation lifecycle status',
    enum: AIConversationStatus,
    example: AIConversationStatus.ACTIVE,
  })
  public status!: AIConversationStatus;

  @ApiProperty({
    description: 'Timestamp of the latest message exchanged in this conversation',
    example: '2026-09-29T21:00:00.000Z',
  })
  public lastMessageAt!: string;

  @ApiPropertyOptional({
    description: 'Timestamp when this conversation was archived, if applicable',
    nullable: true,
    example: null,
  })
  public archivedAt?: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-09-29T20:30:00.000Z',
  })
  public createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-09-29T21:00:00.000Z',
  })
  public updatedAt!: string;
}

export class PaginatedAIConversationsResponseDto {
  @ApiProperty({
    description: 'List of conversations in the current page',
    type: [AIConversationResponseDto],
  })
  public data!: AIConversationResponseDto[];

  @ApiProperty({
    description: 'Total count of conversations matching query criteria',
    example: 12,
  })
  public total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  public page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  public limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 1,
  })
  public totalPages!: number;
}
