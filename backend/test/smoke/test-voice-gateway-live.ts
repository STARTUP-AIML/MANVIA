// ==============================================================================
// MANVIA M6 — REAL VOICE GATEWAY SMOKE TEST
// ==============================================================================
// Verifies both:
// 1. DIRECT GEMINI TEST
// 2. MANVIA GATEWAY -> GEMINI TEST (Mandatory)
// ==============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: process.cwd().endsWith('backend') ? '.env' : 'backend/.env' });

import { WebSocket } from 'ws';
import { ConfigService } from '../../src/config/config.service.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { setupE2EApp, createE2EUser, cleanupE2EUsers } from '../e2e/helpers/auth.helper.js';

interface DirectBidiServerMessage {
  setupComplete?: Record<string, unknown>;
  serverContent?: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
}

async function runVoiceGatewaySmokeTest() {
  console.log('\n======================================================');
  console.log('MANVIA M6 — VOICE GATEWAY & GEMINI LIVE SMOKE TEST');
  console.log('======================================================\n');

  const config = new ConfigService();
  const apiKey = config.geminiApiKey;

  console.log('--- Configuration ---');
  console.log('  GEMINI_API_KEY present:', Boolean(apiKey));
  console.log('  REALTIME_PROVIDER:', config.realtimeProvider);
  console.log('  REALTIME_MODEL:', config.realtimeModel || 'gemini-3.8-live');

  if (!apiKey) {
    console.error('FATAL: GEMINI_API_KEY is not configured in .env');
    process.exit(1);
  }

  // ============================================================================
  // PART 1: DIRECT GEMINI TEST
  // ============================================================================
  console.log('\n======================================================');
  console.log('PART 1: DIRECT GEMINI TEST');
  console.log('======================================================');

  const geminiLiveUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
  const directWs = new WebSocket(geminiLiveUrl);

  const directResult = await new Promise<{
    connected: boolean;
    setupComplete: boolean;
    audioChunks: number;
    totalBytes: number;
  }>((resolve) => {
    let audioChunks = 0;
    let totalBytes = 0;
    let setupComplete = false;

    const timeout = setTimeout(() => {
      directWs.close();
      resolve({ connected: false, setupComplete, audioChunks, totalBytes });
    }, 15000);

    directWs.on('open', () => {
      console.log('  [Direct] WebSocket open to generativelanguage.googleapis.com');
      const setupMsg = {
        setup: {
          model: `models/${config.realtimeModel || 'gemini-3.8-live'}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Aoede' },
              },
            },
          },
        },
      };
      directWs.send(JSON.stringify(setupMsg));
    });

    directWs.on('message', (data) => {
      try {
        const msg: DirectBidiServerMessage = JSON.parse(data.toString());
        if (msg.setupComplete) {
          setupComplete = true;
          console.log('  [Direct] SetupComplete received!');
          // Prompt turn
          directWs.send(
            JSON.stringify({
              clientContent: {
                turns: [{ role: 'user', parts: [{ text: 'Hello' }] }],
                turnComplete: true,
              },
            }),
          );
        }
        if (msg.serverContent?.modelTurn?.parts) {
          for (const p of msg.serverContent.modelTurn.parts) {
            if (p.inlineData) {
              audioChunks++;
              totalBytes += Buffer.from(p.inlineData.data, 'base64').length;
              if (audioChunks === 1) {
                console.log(`  [Direct] First audio chunk received! Size: ${totalBytes} bytes`);
              }
              if (audioChunks >= 2) {
                clearTimeout(timeout);
                directWs.close();
                resolve({ connected: true, setupComplete, audioChunks, totalBytes });
              }
            }
          }
        }
      } catch {
        // ignore parse errors
      }
    });

    directWs.on('error', (err) => {
      console.error('  [Direct] Error:', err.message);
      clearTimeout(timeout);
      resolve({ connected: false, setupComplete, audioChunks, totalBytes });
    });
  });

  console.log('  DIRECT GEMINI TEST Result:');
  console.log('    Connected:', directResult.connected);
  console.log('    SetupComplete:', directResult.setupComplete);
  console.log('    Audio Chunks:', directResult.audioChunks);
  console.log('    Total Audio Bytes:', directResult.totalBytes);

  // ============================================================================
  // PART 2: MANVIA GATEWAY -> GEMINI TEST (Mandatory)
  // ============================================================================
  console.log('\n======================================================');
  console.log('PART 2: MANVIA GATEWAY -> GEMINI TEST (Mandatory)');
  console.log('======================================================');

  // Enforce real realtime provider runtime flag
  process.env.REALTIME_PROVIDER = 'gemini';
  process.env.AI_USE_REAL_REALTIME = 'true';

  console.log('  Bootstrapping MANVIA application with real GeminiRealtimeProvider...');
  const app = await setupE2EApp();
  const prisma = app.get(PrismaService);

  await app.listen(3000, '127.0.0.1');
  const port = (app.getHttpServer().address() as { port: number }).port;
  console.log(`  MANVIA Backend listening at http://127.0.0.1:${port}`);

  const testUser = await createE2EUser(app, { role: 'PATIENT' });
  console.log(`  Created authenticated patient user: ${testUser.id}`);

  // Create Realtime Session
  const sessionRes = await app.inject({
    method: 'POST',
    url: '/api/v1/ai/realtime/session',
    headers: testUser.headers,
    payload: {
      modalities: ['AUDIO', 'TEXT'],
      locale: 'en-US',
    },
  });

  const sessionBody = JSON.parse(sessionRes.body);
  const sessionId = sessionBody.publicSessionId;
  const gatewayUrl = `ws://127.0.0.1:${port}/ws/v1/ai/voice?sessionId=${sessionId}&token=${testUser.token}`;
  console.log(`  Created Realtime Session: ${sessionId}`);
  console.log(`  Connecting client WebSocket to MANVIA Gateway: ${gatewayUrl}`);

  const clientWs = new WebSocket(gatewayUrl);

  const gatewayTestResult = await new Promise<{
    connected: boolean;
    readyReceived: boolean;
    audioFramesReceived: number;
    totalAudioBytes: number;
    bargeInSent: boolean;
    interruptionReceived: boolean;
    playbackStopped: boolean;
    error?: string;
  }>((resolve) => {
    let connected = false;
    let readyReceived = false;
    let audioFramesReceived = 0;
    let totalAudioBytes = 0;
    let bargeInSent = false;
    let interruptionReceived = false;
    let playbackStopped = false;

    const timeout = setTimeout(() => {
      clientWs.close();
      resolve({
        connected,
        readyReceived,
        audioFramesReceived,
        totalAudioBytes,
        bargeInSent,
        interruptionReceived,
        playbackStopped,
        error: 'Timeout waiting for gateway response',
      });
    }, 25000);

    clientWs.on('open', () => {
      connected = true;
      console.log('  [Client -> Gateway] WebSocket connection opened!');
    });

    clientWs.on('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        // Binary audio frame from MANVIA Gateway (forwarded from Gemini Live)
        audioFramesReceived++;
        totalAudioBytes += data.length;

        if (audioFramesReceived === 1) {
          console.log(
            `  [Gateway -> Client] First binary audio frame received! Size: ${data.length} bytes`,
          );
        }

        // Trigger Barge-In Interruption after receiving 2 audio chunks
        if (audioFramesReceived >= 2 && !bargeInSent) {
          bargeInSent = true;
          console.log(
            '\n  >>> [Barge-In] User speaks while AI is speaking! Sending INTERRUPT through MANVIA Gateway...',
          );
          clientWs.send(
            JSON.stringify({
              type: 'INTERRUPT',
              event: 'audio.interrupt',
            }),
          );
        }
      }

      // Check text control message
      if (!isBinary) {
        try {
          const msg = JSON.parse(data.toString('utf-8'));
          if (msg.type === 'READY') {
            readyReceived = true;
            console.log(
              `  [Gateway -> Client] READY handshake confirmed! Session: ${msg.sessionId}, State: ${msg.state}`,
            );

            // Send prompt turn to trigger Gemini Live speech
            console.log(
              '  [Client -> Gateway] Sending prompt: "Hello MANVIA, give me one quick health reminder."',
            );
            clientWs.send(
              JSON.stringify({
                type: 'TEXT',
                text: 'Hello MANVIA, give me one quick health reminder.',
              }),
            );
          }

          if (msg.type === 'TEXT') {
            console.log('  [Gateway -> Client] Interim Transcript:', msg.text);
          }

          if (msg.type === 'INTERRUPTED') {
            interruptionReceived = true;
            playbackStopped = true;
            console.log(
              '  [Gateway -> Client] >>> INTERRUPTED confirmation received from Gateway!',
            );
            console.log('  [Client] Audio playback stopped immediately.');

            clearTimeout(timeout);
            clientWs.close();
            resolve({
              connected,
              readyReceived,
              audioFramesReceived,
              totalAudioBytes,
              bargeInSent,
              interruptionReceived,
              playbackStopped,
            });
          }
        } catch {
          // ignore binary as json error
        }
      }
    });

    clientWs.on('error', (err) => {
      console.error('  [Client Error]:', err.message);
      clearTimeout(timeout);
      resolve({
        connected,
        readyReceived,
        audioFramesReceived,
        totalAudioBytes,
        bargeInSent,
        interruptionReceived,
        playbackStopped,
        error: err.message,
      });
    });

    clientWs.on('close', (code, reason) => {
      console.log(`  [Client Closed] Code: ${code}, Reason: ${reason.toString()}`);
    });
  });

  console.log('\n======================================================');
  console.log('MANVIA GATEWAY -> GEMINI TEST RESULTS');
  console.log('======================================================');
  console.log('  Connected to Gateway:', gatewayTestResult.connected);
  console.log('  Gateway READY Received:', gatewayTestResult.readyReceived);
  console.log('  Real Audio Frames Received:', gatewayTestResult.audioFramesReceived);
  console.log('  Total Real Audio Bytes:', gatewayTestResult.totalAudioBytes);
  console.log('  Barge-in Triggered:', gatewayTestResult.bargeInSent);
  console.log('  Gateway Forwarded Interruption:', gatewayTestResult.interruptionReceived);
  console.log('  Client Stopped Playback:', gatewayTestResult.playbackStopped);
  if (gatewayTestResult.error) {
    console.log('  Error Details:', gatewayTestResult.error);
  }

  // Cleanup
  try {
    await prisma.aIRealtimeSession.deleteMany({ where: { publicSessionId: sessionId } });
    await cleanupE2EUsers(app, [testUser.email]);
    await app.close();
  } catch {
    // ignore
  }

  const success =
    directResult.connected &&
    directResult.audioChunks > 0 &&
    gatewayTestResult.connected &&
    gatewayTestResult.readyReceived &&
    gatewayTestResult.audioFramesReceived > 0 &&
    gatewayTestResult.interruptionReceived &&
    gatewayTestResult.playbackStopped;

  console.log('\nFINAL SMOKE TEST RESULT:', success ? 'ALL PASS' : 'FAIL');
  process.exit(success ? 0 : 1);
}

runVoiceGatewaySmokeTest().catch((err) => {
  console.error('Unhandled smoke test error:', err);
  process.exit(1);
});
