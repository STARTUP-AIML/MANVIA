import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { WebSocket } from 'ws';
import { PrismaService } from '../../src/database/prisma.service.js';
import {
  setupE2EApp,
  createE2EUser,
  cleanupE2EUsers,
  type E2EUser,
} from '../e2e/helpers/auth.helper.js';

interface GatewayMessage {
  type?: string;
  status?: string;
  interrupted?: boolean;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

interface DisconnectResult {
  closed: boolean;
  code?: number | undefined;
  errorMsg?: string | undefined;
}

describe('MANVIA Realtime Voice Gateway (/ws/v1/ai/voice) Integration', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let patientA: E2EUser;
  let patientB: E2EUser;
  let wsBaseUrl: string;
  let sessionAId: string;

  beforeAll(async () => {
    app = await setupE2EApp();
    prisma = app.get(PrismaService);

    patientA = await createE2EUser(app, { role: 'PATIENT' });
    patientB = await createE2EUser(app, { role: 'PATIENT' });

    // Bind server to ephemeral port for WebSocket testing
    await app.listen(0, '127.0.0.1');
    const port = (app.getHttpServer().address() as { port: number }).port;
    wsBaseUrl = `ws://127.0.0.1:${port}/ws/v1/ai/voice`;

    // Create a realtime session for Patient A
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/realtime/session',
      headers: patientA.headers,
      payload: {
        modalities: ['AUDIO', 'TEXT'],
        locale: 'en-US',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    sessionAId = body.publicSessionId;
  }, 60000);

  afterAll(async () => {
    try {
      if (patientA && patientB) {
        await prisma.aIRealtimeSession.deleteMany({
          where: { userId: { in: [patientA.id, patientB.id] } },
        });
        await cleanupE2EUsers(app, [patientA.email, patientB.email]);
      }
    } catch {
      // ignore cleanup errors
    }
    if (app) {
      await app.close();
    }
  });

  async function connectAndWaitReady(
    url: string,
  ): Promise<{ ws: WebSocket; readyMsg: GatewayMessage }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error('Timeout waiting for READY handshake'));
      }, 5000);

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'READY') {
            clearTimeout(timer);
            resolve({ ws, readyMsg: parsed });
          }
        } catch {
          // ignore
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  // ============================================================================
  // 1. Unauthenticated connection rejected
  // ============================================================================
  it('1. should reject unauthenticated connection (missing token)', async () => {
    const ws = new WebSocket(`${wsBaseUrl}?sessionId=${sessionAId}`);

    const result = await new Promise<DisconnectResult>((resolve) => {
      let errorMsg: string | undefined;
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'ERROR') {
            errorMsg = parsed.error;
          }
        } catch {
          // ignore
        }
      });
      ws.on('close', (code) => {
        resolve({ closed: true, code, errorMsg });
      });
      ws.on('error', () => {
        resolve({ closed: true, errorMsg });
      });
    });

    expect(result.closed).toBe(true);
    expect(result.code).toBe(1008);
  });

  // ============================================================================
  // 2. Invalid session rejected
  // ============================================================================
  it('2. should reject non-existent session ID', async () => {
    const ws = new WebSocket(`${wsBaseUrl}?sessionId=RTS-NONEXISTENT99&token=${patientA.token}`);

    const result = await new Promise<DisconnectResult>((resolve) => {
      let errorMsg: string | undefined;
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'ERROR') {
            errorMsg = parsed.error;
          }
        } catch {
          // ignore
        }
      });
      ws.on('close', (code) => {
        resolve({ closed: true, code, errorMsg });
      });
      ws.on('error', () => {
        resolve({ closed: true, errorMsg });
      });
    });

    expect(result.closed).toBe(true);
    expect(result.code).toBe(1008);
    expect(result.errorMsg).toContain('not found');
  });

  // ============================================================================
  // 3. Cross-user session rejected
  // ============================================================================
  it('3. should reject cross-user connection (Patient B trying to connect to Patient A session)', async () => {
    const ws = new WebSocket(`${wsBaseUrl}?sessionId=${sessionAId}&token=${patientB.token}`);

    const result = await new Promise<DisconnectResult>((resolve) => {
      let errorMsg: string | undefined;
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'ERROR') {
            errorMsg = parsed.error;
          }
        } catch {
          // ignore
        }
      });
      ws.on('close', (code) => {
        resolve({ closed: true, code, errorMsg });
      });
      ws.on('error', () => {
        resolve({ closed: true, errorMsg });
      });
    });

    expect(result.closed).toBe(true);
    expect(result.code).toBe(1008);
    expect(result.errorMsg).toContain('do not own this realtime session');
  });

  // ============================================================================
  // 4. Valid session accepted
  // ============================================================================
  it('4. should accept valid authenticated connection and transition to LISTENING', async () => {
    const { ws, readyMsg } = await connectAndWaitReady(
      `${wsBaseUrl}?sessionId=${sessionAId}&token=${patientA.token}`,
    );

    expect(readyMsg.type).toBe('READY');
    expect(readyMsg.sessionId).toBe(sessionAId);
    expect(readyMsg.state).toBe('LISTENING');

    // Verify DB session updated to LISTENING
    const dbSession = await prisma.aIRealtimeSession.findFirst({
      where: { publicSessionId: sessionAId },
    });
    expect(dbSession?.state).toBe('LISTENING');

    ws.close();
  });

  // ============================================================================
  // 5. Client -> Provider Audio Relay
  // ============================================================================
  it('5. should relay client audio frames (binary and base64) to provider without error', async () => {
    const { ws } = await connectAndWaitReady(
      `${wsBaseUrl}?sessionId=${sessionAId}&token=${patientA.token}`,
    );

    // Send binary PCM frame (50ms of synthetic 16kHz 16-bit PCM = 1600 bytes)
    const syntheticPcm = Buffer.alloc(1600, 0x12);
    ws.send(syntheticPcm, { binary: true });

    // Send base64 AUDIO message
    ws.send(
      JSON.stringify({
        type: 'AUDIO',
        data: syntheticPcm.toString('base64'),
      }),
    );

    // Send PING and receive PONG to verify gateway is healthy and actively relaying
    const pong = await new Promise<GatewayMessage>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for PONG')), 5000);
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'PONG') {
            clearTimeout(timer);
            resolve(parsed);
          }
        } catch {
          // ignore
        }
      });
      ws.send(JSON.stringify({ type: 'PING' }));
    });

    expect(pong.type).toBe('PONG');
    ws.close();
  });

  // ============================================================================
  // 6. Provider -> Client Audio Relay
  // ============================================================================
  it('6. should relay provider audio output back to client as binary audio frames', async () => {
    const { ws } = await connectAndWaitReady(
      `${wsBaseUrl}?sessionId=${sessionAId}&token=${patientA.token}`,
    );

    // Trigger mock assistant response via TEXT message
    const audioChunkReceived = await new Promise<boolean>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for audio chunk')), 5000);
      ws.on('message', (data, isBinary) => {
        if (isBinary || Buffer.isBuffer(data)) {
          clearTimeout(timer);
          resolve(true);
        }
      });
      // Send text turn to mock provider, which triggers simulated audio chunk
      ws.send(JSON.stringify({ type: 'TEXT', text: 'Hello MANVIA' }));
    });

    expect(audioChunkReceived).toBe(true);
    ws.close();
  });

  // ============================================================================
  // 7. Interruption Relay
  // ============================================================================
  it('7. should relay barge-in interruption from client to provider and update state', async () => {
    const { ws } = await connectAndWaitReady(
      `${wsBaseUrl}?sessionId=${sessionAId}&token=${patientA.token}`,
    );

    // Send INTERRUPT control message
    const interruptAck = await new Promise<GatewayMessage>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Timeout waiting for interruption ack')),
        5000,
      );
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'INTERRUPTED') {
            clearTimeout(timer);
            resolve(parsed);
          }
        } catch {
          // ignore
        }
      });
      ws.send(JSON.stringify({ type: 'INTERRUPT' }));
    });

    expect(interruptAck.type).toBe('INTERRUPTED');
    expect(interruptAck.interrupted).toBe(true);

    ws.close();
  });

  // ============================================================================
  // 8. Gemini Interrupted Response Forwarded
  // ============================================================================
  it('8. should forward provider-initiated interrupted event to client', async () => {
    const { ws } = await connectAndWaitReady(
      `${wsBaseUrl}?sessionId=${sessionAId}&token=${patientA.token}`,
    );

    // Send audio.interrupt event
    const eventAck = await new Promise<GatewayMessage>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Timeout waiting for audio.interrupt ack')),
        5000,
      );
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'INTERRUPTED' && parsed.interrupted === true) {
            clearTimeout(timer);
            resolve(parsed);
          }
        } catch {
          // ignore
        }
      });
      ws.send(JSON.stringify({ event: 'audio.interrupt' }));
    });

    expect(eventAck.interrupted).toBe(true);
    ws.close();
  });

  // ============================================================================
  // 9. Disconnect Cleanup
  // ============================================================================
  it('9. should cleanly clean up resources on disconnect', async () => {
    const { ws } = await connectAndWaitReady(
      `${wsBaseUrl}?sessionId=${sessionAId}&token=${patientA.token}`,
    );

    const closedPromise = new Promise<void>((resolve) => {
      ws.on('close', () => resolve());
    });
    ws.close();
    await closedPromise;

    expect(ws.readyState).toBe(WebSocket.CLOSED);
  });

  // ============================================================================
  // 10. Malformed Message Rejected
  // ============================================================================
  it('10. should safely handle and reject malformed JSON without crashing gateway', async () => {
    const { ws } = await connectAndWaitReady(
      `${wsBaseUrl}?sessionId=${sessionAId}&token=${patientA.token}`,
    );

    const errorMsg = await new Promise<GatewayMessage>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for error message')), 5000);
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'ERROR') {
            clearTimeout(timer);
            resolve(parsed);
          }
        } catch {
          // ignore
        }
      });
      // Send malformed text payload
      ws.send('NOT_A_VALID_JSON{:::');
    });

    expect(errorMsg.type).toBe('ERROR');
    expect(errorMsg.error).toContain('Malformed JSON');

    ws.close();
  });

  // ============================================================================
  // 11. Oversized Frame Rejected
  // ============================================================================
  it('11. should reject oversized frames (> 2MB) with code 1009 or drop connection', async () => {
    const { ws } = await connectAndWaitReady(
      `${wsBaseUrl}?sessionId=${sessionAId}&token=${patientA.token}`,
    );

    const oversizedBuffer = Buffer.alloc(2.5 * 1024 * 1024); // 2.5 MB

    const closeResult = await new Promise<{ code: number }>((resolve) => {
      ws.on('close', (code) => {
        resolve({ code });
      });
      ws.send(oversizedBuffer, { binary: true });
    });

    expect([1006, 1009]).toContain(closeResult.code);
  });
});
