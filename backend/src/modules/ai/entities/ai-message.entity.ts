import type { AIMessageRole } from '../enums/ai-message-role.enum.js';
import type { AIMessageStatus } from '../enums/ai-message-status.enum.js';
import type { AIMessageGenerationEntity } from './ai-generation.entity.js';
import type { AIMessageFeedbackEntity } from './ai-feedback.entity.js';

export interface AIMessageEntity {
  id: string;
  publicMessageId: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  status: AIMessageStatus;
  createdAt: Date;
  updatedAt: Date;
  generation?: AIMessageGenerationEntity | null;
  feedbacks?: AIMessageFeedbackEntity[];
}
