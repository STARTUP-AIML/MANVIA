import { Inject, Injectable } from '@nestjs/common';
import type { IAIRepository } from '../interfaces/ai-repository.interface.js';
import type { AIContextPayload, BuildContextOptions } from '../interfaces/ai-context.interface.js';
import type { AIProviderMessage } from '../interfaces/ai-provider.interface.js';
import { AI_REPOSITORY } from '../providers/provider.tokens.js';
import {
  DEFAULT_AI_SYSTEM_INSTRUCTION,
  DEFAULT_CONTEXT_WINDOW_LIMIT,
} from '../constants/ai.constants.js';
import { AIMessageRole } from '../enums/ai-message-role.enum.js';

@Injectable()
export class AIContextService {
  constructor(
    @Inject(AI_REPOSITORY)
    private readonly aiRepo: IAIRepository,
  ) {}

  public async buildContext(
    conversationId: string,
    userId: string,
    currentMessageContent: string,
    options?: BuildContextOptions,
  ): Promise<AIContextPayload> {
    const limit = options?.historyLimit ?? DEFAULT_CONTEXT_WINDOW_LIMIT;

    // 1. Fetch bounded conversation history
    const history = await this.aiRepo.findMessagesByConversationId(conversationId, {
      limit,
    });

    // 2. Map existing history to provider messages
    const messages: AIProviderMessage[] = history.map((msg) => ({
      role: this.mapRole(msg.role),
      content: msg.content,
    }));

    // 3. Append current user message if not already present in history
    const lastHistory = messages[messages.length - 1];
    if (!lastHistory || lastHistory.content !== currentMessageContent) {
      messages.push({
        role: 'user',
        content: currentMessageContent,
      });
    }

    // 4. Construct personalized system instruction without clinical data leakage
    let systemInstruction = DEFAULT_AI_SYSTEM_INSTRUCTION;
    if (options?.locale) {
      systemInstruction += ` Please respond in the user's preferred language/locale: ${options.locale}.`;
    }
    if (options?.additionalInstructions) {
      systemInstruction += `\n${options.additionalInstructions}`;
    }

    return {
      systemInstruction,
      messages,
      userContext: {
        userId,
        locale: options?.locale,
        preferredName: options?.preferredName,
      },
    };
  }

  private mapRole(role: AIMessageRole): 'user' | 'assistant' | 'system' {
    switch (role) {
      case AIMessageRole.USER:
        return 'user';
      case AIMessageRole.ASSISTANT:
        return 'assistant';
      case AIMessageRole.SYSTEM:
      default:
        return 'system';
    }
  }
}
