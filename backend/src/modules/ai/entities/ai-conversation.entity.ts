import type { AIConversationStatus } from '../enums/ai-conversation-status.enum.js';

export interface AIConversationEntity {
  id: string;
  publicConversationId: string;
  userId: string;
  title: string;
  status: AIConversationStatus;
  lastMessageAt: Date;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
