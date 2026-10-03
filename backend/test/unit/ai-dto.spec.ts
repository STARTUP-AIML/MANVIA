import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  AIConversationQueryDto,
  CreateAIConversationDto,
  SendAIMessageDto,
  SubmitAIFeedbackDto,
} from '../../src/modules/ai/dto/index.js';
import { AIFeedbackRating } from '../../src/modules/ai/enums/ai-feedback-rating.enum.js';
import { AIConversationStatus } from '../../src/modules/ai/enums/ai-conversation-status.enum.js';

describe('AI DTO Validation (Unit)', () => {
  describe('CreateAIConversationDto', () => {
    it('should pass with empty object', async () => {
      const dto = plainToInstance(CreateAIConversationDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid title', async () => {
      const dto = plainToInstance(CreateAIConversationDto, { title: 'Valid Title' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when title exceeds 255 characters', async () => {
      const dto = plainToInstance(CreateAIConversationDto, { title: 'a'.repeat(256) });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SendAIMessageDto', () => {
    it('should pass with valid content', async () => {
      const dto = plainToInstance(SendAIMessageDto, {
        content: 'Hello AI companion',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with empty content', async () => {
      const dto = plainToInstance(SendAIMessageDto, { content: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when content exceeds max length', async () => {
      const dto = plainToInstance(SendAIMessageDto, { content: 'a'.repeat(4001) });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SubmitAIFeedbackDto', () => {
    it('should pass with POSITIVE rating', async () => {
      const dto = plainToInstance(SubmitAIFeedbackDto, {
        rating: AIFeedbackRating.POSITIVE,
        comment: 'Great advice',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with NEGATIVE rating and no comment', async () => {
      const dto = plainToInstance(SubmitAIFeedbackDto, {
        rating: AIFeedbackRating.NEGATIVE,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid rating enum value', async () => {
      const dto = plainToInstance(SubmitAIFeedbackDto, {
        rating: 'SUPER_POSITIVE',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('AIConversationQueryDto', () => {
    it('should pass with defaults', async () => {
      const dto = plainToInstance(AIConversationQueryDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with transformed numbers', async () => {
      const dto = plainToInstance(AIConversationQueryDto, {
        page: '2',
        limit: '15',
        status: AIConversationStatus.ACTIVE,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(15);
    });

    it('should fail when page < 1', async () => {
      const dto = plainToInstance(AIConversationQueryDto, { page: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when limit > 100', async () => {
      const dto = plainToInstance(AIConversationQueryDto, { limit: 101 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
