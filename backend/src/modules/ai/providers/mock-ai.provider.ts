import { Injectable } from '@nestjs/common';
import type {
  AIProviderRequest,
  AIProviderResponse,
  IAIProvider,
} from '../interfaces/ai-provider.interface.js';
import {
  AI_DISCLOSURE_NOTICE,
  MOCK_AI_MODEL_NAME,
  MOCK_AI_PROVIDER_NAME,
} from '../constants/ai.constants.js';

@Injectable()
export class MockAIProvider implements IAIProvider {
  public async generateResponse(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startTime = Date.now();

    // Check last user message
    const lastUserMessage =
      [...request.messages].reverse().find((m) => m.role === 'user')?.content ?? '';

    // Error simulation hook for testing
    if (lastUserMessage.includes('SIMULATE_AI_PROVIDER_FAILURE')) {
      throw new Error('Upstream mock AI model provider timeout');
    }

    const responseContent = this.generateDeterministicContent(
      lastUserMessage,
      request.userContext?.preferredName,
    );

    // Rough token calculation (approx. 4 chars per token)
    const promptChars =
      request.messages.reduce((acc, m) => acc + m.content.length, 0) +
      request.systemInstruction.length;
    const promptTokens = Math.max(1, Math.ceil(promptChars / 4));
    const completionTokens = Math.max(1, Math.ceil(responseContent.length / 4));

    const latencyMs = Math.max(1, Date.now() - startTime);

    return {
      content: responseContent,
      provider: MOCK_AI_PROVIDER_NAME,
      model: MOCK_AI_MODEL_NAME,
      latencyMs,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      finishReason: 'stop',
      isAiGenerated: true,
      disclosureNotice: AI_DISCLOSURE_NOTICE,
    };
  }

  private generateDeterministicContent(input: string, preferredName?: string): string {
    const greeting = preferredName ? `Hello ${preferredName}!` : 'Hello!';
    const lower = input.toLowerCase();

    // 1. Clinical, diagnosis, or prescription queries -> explicit non-clinical boundary
    if (
      lower.includes('diagnos') ||
      lower.includes('prescrib') ||
      lower.includes('medication') ||
      lower.includes('chest pain') ||
      lower.includes('heart attack') ||
      lower.includes('antibiotic') ||
      lower.includes('emergency') ||
      lower.includes('cure')
    ) {
      return (
        `${greeting} While I understand your concern, as your MANVIA AI Companion, I am not a licensed medical professional. ` +
        `I cannot provide clinical diagnoses, interpret medical emergencies, or prescribe medications. ` +
        `If you are experiencing acute symptoms or an emergency, please contact your local emergency services or consult a qualified physician immediately. ` +
        `I am happy to assist with general healthy habits and lifestyle routines once you've consulted your doctor.`
      );
    }

    // 2. Sleep inquiries
    if (lower.includes('sleep') || lower.includes('insomnia') || lower.includes('tired')) {
      return (
        `${greeting} Quality rest is essential for your overall well-being. ` +
        `To cultivate restful sleep, consider maintaining a consistent sleep schedule, dimming lights 1 hour before bed, and creating a cool, dark sleep sanctuary. ` +
        `Limiting caffeine in the late afternoon and stepping away from digital screens before sleep can also support your body's natural circadian rhythm.`
      );
    }

    // 3. Stress / mindfulness inquiries
    if (
      lower.includes('stress') ||
      lower.includes('anxiety') ||
      lower.includes('overwhelm') ||
      lower.includes('relax')
    ) {
      return (
        `${greeting} Managing daily stress is a journey of small, intentional habits. ` +
        `Try taking 3 deep diaphragmatic breaths—inhaling for 4 seconds, holding for 4, and exhaling for 6 seconds. ` +
        `Even a brief 5-minute pause away from screens or a gentle stretch can help reset your nervous system and bring calm to your day.`
      );
    }

    // 4. Hydration / nutrition inquiries
    if (
      lower.includes('water') ||
      lower.includes('hydrat') ||
      lower.includes('diet') ||
      lower.includes('food') ||
      lower.includes('nutrition')
    ) {
      return (
        `${greeting} Nourishing your body with wholesome foods and consistent hydration powers your energy and focus. ` +
        `A helpful guideline is drinking water consistently throughout the day rather than all at once, and aiming for colorful, balanced plates with fiber, lean protein, and healthy fats.`
      );
    }

    // 5. Exercise / activity inquiries
    if (
      lower.includes('walk') ||
      lower.includes('exercise') ||
      lower.includes('workout') ||
      lower.includes('activity')
    ) {
      return (
        `${greeting} Consistent movement is one of the most rewarding wellness habits. ` +
        `You don't need intense workouts every day—brisk walking, light stretching, or taking stairs can elevate your mood, support circulation, and improve stamina.`
      );
    }

    // 6. Greetings
    if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
      return (
        `${greeting} Welcome to your MANVIA AI Companion. I am here to assist you with daily wellness routines, lifestyle awareness, and healthy habits. ` +
        `How can I support your wellness journey today?`
      );
    }

    // Default supportive response
    return (
      `${greeting} Thank you for sharing. As your MANVIA AI Companion, I am here to help you navigate everyday wellness, mindfulness, and health habits. ` +
      `How can we work together today toward your wellness goals?`
    );
  }
}
