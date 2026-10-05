export interface RealtimeSessionConnectionInfo {
  transport: 'websocket' | 'webrtc_signaling';
  endpoint: string;
  clientSessionToken: string;
  expiresInSeconds: number;
}

export interface RealtimeStreamSession {
  sendAudioChunk(chunk: Buffer | Uint8Array): void;
  sendTextMessage(text: string): void;
  sendInterrupt(reason?: string): void;
  close(code?: number, reason?: string): void;
}

export interface RealtimeStreamCallbacks {
  onAudioChunk: (chunk: Buffer, mimeType: string) => void;
  onTextChunk?: (text: string) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
}

export interface RealtimeAIProvider {
  readonly providerName?: string;

  createSession(params: {
    userId: string;
    sessionId: string;
    model?: string | undefined;
  }): Promise<RealtimeSessionConnectionInfo>;

  interruptResponse(sessionId: string): Promise<{ cancelled: boolean; latencyMs: number }>;

  endSession(sessionId: string): Promise<{ terminated: boolean }>;

  establishLiveStream?(params: {
    sessionId: string;
    userId: string;
    callbacks: RealtimeStreamCallbacks;
  }): Promise<RealtimeStreamSession>;
}
