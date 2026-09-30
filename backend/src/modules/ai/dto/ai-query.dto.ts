import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AIConversationStatus } from '../enums/ai-conversation-status.enum.js';

export class AIConversationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for paginated conversation listings (1-indexed)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  public page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of conversations per page (max 100)',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  public limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter conversations by lifecycle status',
    enum: AIConversationStatus,
    example: AIConversationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AIConversationStatus, {
    message: 'status must be a valid AIConversationStatus value',
  })
  public status?: AIConversationStatus;
}
