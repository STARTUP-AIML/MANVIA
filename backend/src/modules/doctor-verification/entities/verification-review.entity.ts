import type { ReviewAction } from '../enums/review-action.enum.js';

export interface VerificationReviewEntity {
  id: string;
  verificationId: string;
  reviewerAdminId: string;
  action: ReviewAction;
  reason: string | null;
  notes: string | null;
  createdAt: Date;
}
