import { AIRealtimeState } from './realtime.enums.js';
import { ValidationError } from '../../../common/errors/app-error.js';

export class RealtimeStateMachine {
  private static readonly VALID_TRANSITIONS: Record<AIRealtimeState, AIRealtimeState[]> = {
    [AIRealtimeState.IDLE]: [
      AIRealtimeState.LISTENING,
      AIRealtimeState.ENDED,
      AIRealtimeState.ERROR,
    ],
    [AIRealtimeState.LISTENING]: [
      AIRealtimeState.PROCESSING,
      AIRealtimeState.MUTED,
      AIRealtimeState.PAUSED,
      AIRealtimeState.HANDOFF_TO_HUMAN,
      AIRealtimeState.ENDED,
      AIRealtimeState.ERROR,
    ],
    [AIRealtimeState.PROCESSING]: [
      AIRealtimeState.SPEAKING,
      AIRealtimeState.LISTENING,
      AIRealtimeState.INTERRUPTED,
      AIRealtimeState.ENDED,
      AIRealtimeState.ERROR,
    ],
    [AIRealtimeState.SPEAKING]: [
      AIRealtimeState.LISTENING,
      AIRealtimeState.INTERRUPTED,
      AIRealtimeState.PAUSED,
      AIRealtimeState.HANDOFF_TO_HUMAN,
      AIRealtimeState.ENDED,
      AIRealtimeState.ERROR,
    ],
    [AIRealtimeState.INTERRUPTED]: [
      AIRealtimeState.LISTENING,
      AIRealtimeState.PROCESSING,
      AIRealtimeState.ENDED,
      AIRealtimeState.ERROR,
    ],
    [AIRealtimeState.MUTED]: [
      AIRealtimeState.LISTENING,
      AIRealtimeState.ENDED,
      AIRealtimeState.ERROR,
    ],
    [AIRealtimeState.PAUSED]: [
      AIRealtimeState.LISTENING,
      AIRealtimeState.SPEAKING,
      AIRealtimeState.ENDED,
      AIRealtimeState.ERROR,
    ],
    [AIRealtimeState.RECONNECTING]: [
      AIRealtimeState.LISTENING,
      AIRealtimeState.IDLE,
      AIRealtimeState.ENDED,
      AIRealtimeState.ERROR,
    ],
    [AIRealtimeState.ERROR]: [AIRealtimeState.RECONNECTING, AIRealtimeState.ENDED],
    [AIRealtimeState.HANDOFF_TO_HUMAN]: [AIRealtimeState.ENDED],
    [AIRealtimeState.ENDED]: [],
  };

  public static canTransition(current: AIRealtimeState, next: AIRealtimeState): boolean {
    const allowed = this.VALID_TRANSITIONS[current] ?? [];
    return allowed.includes(next);
  }

  public static isValidTransition(current: AIRealtimeState, next: AIRealtimeState): boolean {
    return this.canTransition(current, next);
  }

  public static validateTransition(current: AIRealtimeState, next: AIRealtimeState): void {
    if (!this.canTransition(current, next)) {
      throw new ValidationError(
        `Invalid realtime session transition from '${current}' to '${next}'`,
      );
    }
  }
}
