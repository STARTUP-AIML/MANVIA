export interface RealtimeSessionConnectionInfo {
  transport: 'websocket' | 'webrtc_signaling';
  endpoint: string;
  clientSessionToken: string;
  expiresInSeconds: number;
}

export interface RealtimeAIProvider {
  createSession(params: {
    userId: string;
    sessionId: string;
    model?: string | undefined;
  }): Promise<RealtimeSessionConnectionInfo>;

  interruptResponse(sessionId: string): Promise<{ cancelled: boolean; latencyMs: number }>;

  endSession(sessionId: string): Promise<{ terminated: boolean }>;
}
