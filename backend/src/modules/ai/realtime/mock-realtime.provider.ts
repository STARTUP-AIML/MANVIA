import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  type RealtimeAIProvider,
  type RealtimeSessionConnectionInfo,
} from './realtime-provider.interface.js';

@Injectable()
export class MockRealtimeProvider implements RealtimeAIProvider {
  public async createSession(params: {
    userId: string;
    sessionId: string;
    model?: string | undefined;
  }): Promise<RealtimeSessionConnectionInfo> {
    const ephemeralToken = randomBytes(24).toString('hex');
    return {
      transport: 'websocket',
      endpoint: `wss://realtime.manvia.internal/v1/sessions/${params.sessionId}`,
      clientSessionToken: `rt_tok_${ephemeralToken}`,
      expiresInSeconds: 3600,
    };
  }

  public async interruptResponse(
    _sessionId: string,
  ): Promise<{ cancelled: boolean; latencyMs: number }> {
    // Deterministic mock barge-in cancellation within 15ms
    return {
      cancelled: true,
      latencyMs: 15,
    };
  }

  public async endSession(_sessionId: string): Promise<{ terminated: boolean }> {
    return { terminated: true };
  }
}
