import dotenv from 'dotenv';
dotenv.config({ path: process.cwd().endsWith('backend') ? '.env' : 'backend/.env' });

import { ConfigService } from '../../src/config/config.service.js';
import { GeminiRealtimeProvider } from '../../src/modules/ai/realtime/gemini-realtime.provider.js';

interface BidiServerMessage {
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

async function testGeminiLiveE2E() {
  console.log('\n======================================================');
  console.log('MANVIA M6 — REALTIME END-TO-END VERIFICATION');
  console.log('======================================================\n');

  const config = new ConfigService();
  const apiKey = config.geminiApiKey;
  console.log('1. Checking Configuration...');
  console.log('  GEMINI_API_KEY present:', Boolean(apiKey));
  console.log('  REALTIME_PROVIDER:', config.realtimeProvider);
  console.log('  REALTIME_MODEL:', config.realtimeModel);

  // Step 1: Realtime Session Creation via Provider
  console.log('\n2. Testing Realtime Session Creation via GeminiRealtimeProvider...');
  const provider = new GeminiRealtimeProvider(config);
  const sessionInfo = await provider.createSession({
    userId: 'test-patient-uuid-1',
    sessionId: 'RTS-REAL-VERIFY-1',
  });
  console.log('  Session Transport:', sessionInfo.transport);
  console.log('  Gateway Endpoint:', sessionInfo.endpoint);
  console.log('  Client Session Token:', sessionInfo.clientSessionToken);
  console.log('  Provider Name:', provider.providerName);

  // Step 2: Test WebSocket Connection to Gemini Live API directly
  console.log('\n3. Testing Gemini Live API Direct Bidirectional WebSocket...');
  const geminiLiveUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

  const ws = new WebSocket(geminiLiveUrl);

  const connectionPromise = new Promise<{
    connected: boolean;
    setupComplete: boolean;
    receivedAudioChunks: number;
    receivedTextChunks: number;
    totalAudioBytes: number;
    turnComplete: boolean;
    interrupted: boolean;
    bargeInSent: boolean;
    error?: string | undefined;
  }>((resolve) => {
    let connected = false;
    let setupComplete = false;
    let receivedAudioChunks = 0;
    let receivedTextChunks = 0;
    let totalAudioBytes = 0;
    let turnComplete = false;
    let interrupted = false;
    let bargeInSent = false;

    const timeout = setTimeout(() => {
      ws.close();
      resolve({
        connected,
        setupComplete,
        receivedAudioChunks,
        receivedTextChunks,
        totalAudioBytes,
        turnComplete,
        interrupted,
        bargeInSent,
        error: 'Timeout waiting for Gemini Live response',
      });
    }, 20000);

    ws.onopen = () => {
      connected = true;
      console.log('  [WebSocket] Connected to Gemini Live upstream!');

      // Send setup message
      const setupMsg = {
        setup: {
          model: `models/${config.realtimeModel || 'gemini-3.8-live'}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede',
                },
              },
            },
          },
        },
      };
      console.log('  [WebSocket] Sending setup payload for model:', setupMsg.setup.model);
      ws.send(JSON.stringify(setupMsg));
    };

    ws.onmessage = async (event) => {
      try {
        let raw: string;
        if (event.data instanceof Blob) {
          raw = await event.data.text();
        } else if (typeof event.data === 'string') {
          raw = event.data;
        } else {
          raw = String(event.data);
        }

        const msg: BidiServerMessage = JSON.parse(raw);

        if (msg.setupComplete) {
          setupComplete = true;
          console.log('  [WebSocket] Received setupComplete from Gemini Live!');

          // Send an audio or text prompt turn to trigger response
          console.log(
            '  [WebSocket] Sending user turn ("Hello MANVIA, I need help with sleep.")...\n',
          );
          const clientTurnMsg = {
            clientContent: {
              turns: [
                {
                  role: 'user',
                  parts: [{ text: 'Hello MANVIA, I need help with sleep.' }],
                },
              ],
              turnComplete: true,
            },
          };
          ws.send(JSON.stringify(clientTurnMsg));
        }

        if (msg.serverContent) {
          if (msg.serverContent.modelTurn) {
            for (const part of msg.serverContent.modelTurn.parts || []) {
              if (part.text) {
                receivedTextChunks++;
                console.log('  [WebSocket] Model text chunk:', part.text);
              }
              if (part.inlineData) {
                receivedAudioChunks++;
                const buf = Buffer.from(part.inlineData.data, 'base64');
                totalAudioBytes += buf.length;
                if (receivedAudioChunks === 1) {
                  console.log(
                    `  [WebSocket] First audio chunk received! MIME: ${part.inlineData.mimeType}, size: ${buf.length} bytes`,
                  );
                }

                // Test barge-in interruption after receiving first 3 chunks:
                if (receivedAudioChunks === 3 && !bargeInSent) {
                  bargeInSent = true;
                  console.log(
                    '\n  >>> [Barge-in Simulation] User speaks while AI is speaking! Sending interrupt turn...',
                  );
                  const interruptTurn = {
                    clientContent: {
                      turns: [
                        {
                          role: 'user',
                          parts: [{ text: 'Wait stop, I have a quick question first.' }],
                        },
                      ],
                      turnComplete: true,
                    },
                  };
                  ws.send(JSON.stringify(interruptTurn));
                }
              }
            }
          }

          if (msg.serverContent.interrupted) {
            interrupted = true;
            console.log('  [WebSocket] >>> SERVER CONFIRMED INTERRUPTION (interrupted: true)!');
          }

          if (msg.serverContent.turnComplete) {
            turnComplete = true;
            console.log(
              `  [WebSocket] Turn complete received! Audio chunks: ${receivedAudioChunks}, Audio bytes: ${totalAudioBytes}`,
            );
            if (bargeInSent) {
              clearTimeout(timeout);
              ws.close();
              resolve({
                connected,
                setupComplete,
                receivedAudioChunks,
                receivedTextChunks,
                totalAudioBytes,
                turnComplete,
                interrupted,
                bargeInSent,
              });
            }
          }
        }
      } catch (err) {
        console.error('  [WebSocket] Error parsing server message:', (err as Error).message);
      }
    };

    ws.onerror = (evt) => {
      console.error('  [WebSocket Error]:', evt);
    };

    ws.onclose = (evt) => {
      console.log(`  [WebSocket Closed] Code: ${evt.code}, Reason: "${evt.reason}"`);
      clearTimeout(timeout);
      resolve({
        connected,
        setupComplete,
        receivedAudioChunks,
        receivedTextChunks,
        totalAudioBytes,
        turnComplete,
        interrupted,
        bargeInSent,
        error: !setupComplete ? `Closed with code ${evt.code}: ${evt.reason}` : undefined,
      });
    };
  });

  const result = await connectionPromise;
  console.log('\n--- Gemini Live Test Result Summary ---');
  console.log('  Connected:', result.connected);
  console.log('  Setup Complete:', result.setupComplete);
  console.log('  Audio Chunks Received:', result.receivedAudioChunks);
  console.log('  Total Audio Bytes Received:', result.totalAudioBytes);
  console.log('  Barge-in Triggered:', result.bargeInSent);
  console.log('  Server Acknowledged Interruption:', result.interrupted);
  console.log('  Turn Complete:', result.turnComplete);
  if (result.error) {
    console.log('  Upstream Detail/Error:', result.error);
  }

  // Step 3: Test Reconnect behavior
  console.log('\n4. Testing Upstream Reconnection...');
  const ws2 = new WebSocket(geminiLiveUrl);
  const reconnectResult = await new Promise<boolean>((resolve) => {
    const t = setTimeout(() => {
      ws2.close();
      resolve(false);
    }, 5000);
    ws2.onopen = () => {
      clearTimeout(t);
      ws2.close();
      resolve(true);
    };
    ws2.onerror = () => {
      clearTimeout(t);
      resolve(false);
    };
  });
  console.log('  Reconnected Successfully:', reconnectResult);

  // Step 4: Check if local gateway is running
  console.log('\n5. Checking Local MANVIA Realtime Gateway Endpoint...');
  console.log('  Configured Gateway Endpoint:', sessionInfo.endpoint);
  try {
    const localWs = new WebSocket(sessionInfo.endpoint);
    const localGatewayRunning = await new Promise<boolean>((resolve) => {
      const t = setTimeout(() => {
        localWs.close();
        resolve(false);
      }, 2000);
      localWs.onopen = () => {
        clearTimeout(t);
        localWs.close();
        resolve(true);
      };
      localWs.onerror = () => {
        clearTimeout(t);
        resolve(false);
      };
    });
    console.log('  Local Gateway WebSocket accessible:', localGatewayRunning);
  } catch (e) {
    console.log('  Local Gateway check failed:', (e as Error).message);
  }
}

testGeminiLiveE2E().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
