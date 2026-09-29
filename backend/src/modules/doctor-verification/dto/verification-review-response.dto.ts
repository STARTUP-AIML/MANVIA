import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewAction } from '../enums/review-action.enum.js';

export class VerificationReviewResponseDto {
  @ApiProperty({
    description: 'Unique review record identifier',
    example: 'r1a2b3c4-0000-0000-0000-000000000001',
  })
  id!: string;

  @ApiProperty({
    description: 'Administrator user ID who executed the review action',
    example: 'adm-00000000-0000-0000-0000-000000000001',
  })
  reviewerAdminId!: string;

  @ApiProperty({
    description: 'Review decision/action taken',
    enum: ReviewAction,
    example: ReviewAction.APPROVED,
  })
  action!: ReviewAction;

  @ApiPropertyOptional({
    description: 'Rejection reason if action was REJECTED',
    example: null,
  })
  reason!: string | null;

  @ApiPropertyOptional({
    description: 'Administrative notes',
    example: 'Verified against state registry.',
  })
  notes!: string | null;

  @ApiProperty({
    description: 'Timestamp when review action occurred',
    example: '2026-09-29T11:00:00.000Z',
  })
  createdAt!: string;
}
