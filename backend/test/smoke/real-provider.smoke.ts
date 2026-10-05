import dotenv from 'dotenv';
dotenv.config({ path: process.cwd().endsWith('backend') ? '.env' : 'backend/.env' });

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../../src/config/config.service.js';
import { GeminiAIProvider } from '../../src/modules/ai/providers/gemini-ai.provider.js';
import { PrismaMedicalRetriever } from '../../src/modules/ai/rag/prisma-medical.retriever.js';
import { LayeredSafetyClassifier } from '../../src/modules/ai/safety/layered-safety.classifier.js';
import { GeminiRealtimeProvider } from '../../src/modules/ai/realtime/gemini-realtime.provider.js';
import { DEFAULT_AI_SYSTEM_INSTRUCTION } from '../../src/modules/ai/constants/ai.constants.js';

async function runSmokeTests() {
  console.log('\n======================================================');
  console.log('MANVIA M6 — REAL RUNTIME PROVIDER LOCAL SMOKE TESTS');
  console.log('======================================================\n');

  const config = new ConfigService();
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
  }) as unknown as import('../../src/database/prisma.service.js').PrismaService;

  // ------------------------------------------------------------------
  // 1. MAIN AI PROVIDER (Gemini)
  // ------------------------------------------------------------------
  console.log('--- 1. Testing Real Main AI Provider (Gemini) ---');
  const geminiProvider = new GeminiAIProvider(config);
  const aiStart = performance.now();
  const aiResponse = await geminiProvider.generateResponse({
    systemInstruction: DEFAULT_AI_SYSTEM_INSTRUCTION,
    messages: [
      {
        role: 'user',
        content:
          'I want to build a better evening routine for restorative sleep. Give me two evidence-based tips in 50 words.',
      },
    ],
    userContext: {
      userId: 'smoke-test-user-001',
      preferredName: 'Aarav',
      locale: 'en-US',
    },
    maxTokens: 150,
  });
  const aiElapsed = Math.round(performance.now() - aiStart);

  console.log('  [Provider]:', aiResponse.provider);
  console.log('  [Model]:', aiResponse.model);
  console.log(
    '  [Measured Latency]:',
    aiResponse.latencyMs,
    'ms (total roundtrip:',
    aiElapsed,
    'ms)',
  );
  console.log('  [Token Usage]:', aiResponse.usage);
  console.log('  [Is AI Generated]:', aiResponse.isAiGenerated);
  console.log('  [Disclosure Notice Attached]:', Boolean(aiResponse.disclosureNotice));
  console.log('  [Preview Content]:', aiResponse.content.slice(0, 140).replace(/\n/g, ' ') + '...');

  if (aiResponse.provider === 'MOCK_PROVIDER') {
    throw new Error(
      'SMOKE TEST FAILED: Provider resolved to MOCK_PROVIDER instead of real provider',
    );
  }

  // ------------------------------------------------------------------
  // 2. MEDICAL RAG (Prisma + PostgreSQL)
  // ------------------------------------------------------------------
  console.log('\n--- 2. Testing Real Medical RAG Retriever (PostgreSQL Persistent Data) ---');
  const ragRetriever = new PrismaMedicalRetriever(prisma, config);
  const ragStart = performance.now();
  const ragResult = await ragRetriever.retrieve(
    'blood pressure hypertension reduction guidelines',
    3,
  );
  const ragElapsed = Math.round(performance.now() - ragStart);

  console.log('  [Query]:', ragResult.query);
  console.log('  [Medical Context Used]:', ragResult.medicalContextUsed);
  console.log('  [Total Chunks Retrieved]:', ragResult.totalRetrieved);
  console.log('  [Measured Query Latency]:', ragElapsed, 'ms');

  for (const chunk of ragResult.chunks) {
    console.log(`    -> Source: ${chunk.sourceTitle} (${chunk.organization})`);
    console.log(`       Trust Status: ${chunk.trustStatus} | Relevance: ${chunk.relevance}`);
    if (chunk.trustStatus === 'SYNTHETIC_MOCK') {
      throw new Error(
        'SMOKE TEST FAILED: Medical RAG returned SYNTHETIC_MOCK trust status instead of persisted authority data',
      );
    }
  }

  // ------------------------------------------------------------------
  // 3. LAYERED SAFETY CLASSIFIER (Deterministic + Policy)
  // ------------------------------------------------------------------
  console.log('\n--- 3. Testing Layered Safety Classifier ---');
  const safetyClassifier = new LayeredSafetyClassifier(config);

  // Test 3a: Safe wellness input
  const safeStart = performance.now();
  const safeResult = await safetyClassifier.classify(
    'What are healthy snack options before an evening walk?',
    'en-US',
  );
  const safeLatency = Math.round(performance.now() - safeStart);
  console.log('  [3a Safe Wellness]');
  console.log('    Classification:', safeResult.classification);
  console.log('    Action:', safeResult.action);
  console.log('    Escalation Required:', safeResult.escalationRequired);
  console.log('    Latency:', safeLatency, 'ms');

  // Test 3b: Acute Emergency input
  const emerStart = performance.now();
  const emerResult = await safetyClassifier.classify(
    'I have severe crushing chest pain radiating to my left arm',
    'en-US',
  );
  const emerLatency = Math.round(performance.now() - emerStart);
  console.log('  [3b Acute Emergency]');
  console.log('    Classification:', emerResult.classification);
  console.log('    Action:', emerResult.action);
  console.log('    Escalation Required:', emerResult.escalationRequired);
  console.log('    Matched Rules:', emerResult.matchedRules);
  console.log('    Latency:', emerLatency, 'ms');

  // Test 3c: Crisis / Self-Harm input
  const crisisResult = await safetyClassifier.classify(
    'I want to kill myself and end it all',
    'en-US',
  );
  console.log('  [3c Crisis / Self-Harm]');
  console.log('    Classification:', crisisResult.classification);
  console.log('    Action:', crisisResult.action);
  console.log('    Escalation Required:', crisisResult.escalationRequired);
  console.log('    Emergency Advisory:', crisisResult.advisoryMessage?.slice(0, 80) + '...');

  // ------------------------------------------------------------------
  // 4. REALTIME AI PROVIDER (Gemini Live Voice Gateway)
  // ------------------------------------------------------------------
  console.log('\n--- 4. Testing Realtime Voice Provider (Gemini Live Gateway) ---');
  const realtimeProvider = new GeminiRealtimeProvider(config);
  const sessionStart = performance.now();
  const sessionInfo = await realtimeProvider.createSession({
    userId: 'smoke-patient-001',
    sessionId: 'RTS-SMOKE-8A2D',
  });
  const sessionLatency = Math.round(performance.now() - sessionStart);

  console.log('  [Transport]:', sessionInfo.transport);
  console.log('  [Gateway Endpoint]:', sessionInfo.endpoint);
  console.log(
    '  [Client Session Token Format]:',
    sessionInfo.clientSessionToken.slice(0, 16) + '...',
  );
  console.log('  [Token TTL]:', sessionInfo.expiresInSeconds, 'seconds');
  console.log('  [Session Creation Latency]:', sessionLatency, 'ms');

  // Test 4b: Barge-in / Interruption
  const interruptResult = await realtimeProvider.interruptResponse('RTS-SMOKE-8A2D');
  console.log('  [Barge-in Interruption Result]:', interruptResult);
  console.log('  [Interruption Measured Latency]:', interruptResult.latencyMs, 'ms');

  // Cleanup
  await realtimeProvider.endSession('RTS-SMOKE-8A2D');
  await pool.end();

  console.log('\n======================================================');
  console.log('ALL REAL RUNTIME PROVIDER SMOKE TESTS PASSED!');
  console.log('======================================================\n');
}

runSmokeTests().catch((err) => {
  console.error('\nSMOKE TEST EXECUTION ERROR:\n', err);
  process.exit(1);
});
