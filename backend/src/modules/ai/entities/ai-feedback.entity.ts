import type { AIFeedbackRating } from '../enums/ai-feedback-rating.enum.js';

export interface AIMessageFeedbackEntity {
  id: string;
  messageId: string;
  userId: string;
  rating: AIFeedbackRating;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}
