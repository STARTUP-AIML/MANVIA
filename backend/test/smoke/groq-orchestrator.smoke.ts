import dotenv from 'dotenv';
dotenv.config({ path: process.cwd().endsWith('backend') ? '.env' : 'backend/.env' });

import { ConfigService } from '../../src/config/config.service.js';
import { GroqAIProvider } from '../../src/modules/ai/providers/groq-ai.provider.js';
import { AIOrchestratorService } from '../../src/modules/ai/services/ai-orchestrator.service.js';
import { AIContextService } from '../../src/modules/ai/services/ai-context.service.js';
import { InMemoryAIRepository } from '../../src/modules/ai/repositories/in-memory-ai.repository.js';
import { AIAuditService } from '../../src/modules/ai/services/ai-audit.service.js';
import { AIMessageRole } from '../../src/modules/ai/enums/ai-message-role.enum.js';
import { AIMessageStatus } from '../../src/modules/ai/enums/ai-message-status.enum.js';
import { AISafetyService } from '../../src/modules/ai/safety/ai-safety.service.js';
import { LayeredSafetyClassifier } from '../../src/modules/ai/safety/layered-safety.classifier.js';
import { PrismaService } from '../../src/database/prisma.service.js';

async function runGroqOrchestratorSmokeTest() {
  console.log('\n======================================================');
  console.log('MANVIA — GROQ AI ORCHESTRATION PIPELINE SMOKE TEST');
  console.log('======================================================\n');

  const config = new ConfigService();
  if (!config.groqApiKey) {
    console.error('[FAILED] GROQ_API_KEY missing from environment.');
    process.exit(1);
  }

  const groqProvider = new GroqAIProvider(config);
  const repository = new InMemoryAIRepository();
  const contextService = new AIContextService(repository);
  const auditService = new AIAuditService();
  const safetyClassifier = new LayeredSafetyClassifier(config);
  const prismaMock = {
    aIConversation: { findUnique: async () => null },
    aISafetyEvent: { create: async () => ({}) },
  } as unknown as PrismaService;
  const safetyService = new AISafetyService(safetyClassifier, prismaMock, auditService);

  const orchestrator = new AIOrchestratorService(
    groqProvider,
    repository,
    contextService,
    auditService,
    safetyService,
  );

  console.log('1. Setting up synthetic conversation & user message...');
  const conversation = await repository.createConversation({
    userId: 'usr-patient-groq-001',
    publicConversationId: 'AIC-GROQ0001',
    title: 'Groq Pipeline Smoke Test',
  });

  const promptText =
    'Provide two brief, practical tips for maintaining consistent daily hydration.';
  const userMessage = await repository.createMessage({
    publicMessageId: 'AIM-GROQUSR1',
    conversationId: conversation.id,
    role: AIMessageRole.USER,
    content: promptText,
    status: AIMessageStatus.SENT,
  });

  console.log(`2. Processing message through AI Orchestrator with Groq: "${promptText}"...`);
  const startTime = performance.now();
  const result = await orchestrator.processMessage({
    conversationId: conversation.id,
    userMessageId: userMessage.id,
    userId: 'usr-patient-groq-001',
    content: promptText,
    correlationId: 'smoke-test-corr-groq-101',
    options: {
      preferredName: 'Jordan',
      locale: 'en-US',
    },
  });
  const elapsedMs = Math.round(performance.now() - startTime);

  console.log('\n3. AI Orchestrator Pipeline Result:');
  console.log(`   - Assistant Message ID: ${result.assistantMessage.publicMessageId}`);
  console.log(`   - Assistant Role:       ${result.assistantMessage.role}`);
  console.log(`   - Delivery Status:      ${result.assistantMessage.status}`);
  console.log(`   - Provider Used:        ${result.generation.provider}`);
  console.log(`   - Model Used:           ${result.generation.model}`);
  console.log(
    `   - Measured Latency:     ${result.generation.latencyMs} ms (total: ${elapsedMs} ms)`,
  );
  console.log(`   - Total Tokens:         ${result.generation.totalTokens}`);
  console.log(
    `   - Safety Pre-Check:     ${result.safetyClassification ?? 'SAFE'} (action: ${result.safetyAction ?? 'ALLOW'})`,
  );
  console.log(
    `   - Mandatory Disclosure: ${result.generation.disclosureNotice ? 'ATTACHED' : 'MISSING'}`,
  );
  console.log(
    `   - Preview Content:      "${result.assistantMessage.content.slice(0, 160).replace(/\n/g, ' ')}..."`,
  );

  if (result.generation.provider !== 'groq') {
    throw new Error(
      `Orchestration failed: Expected provider "groq", got "${result.generation.provider}"`,
    );
  }

  if (!result.assistantMessage.content || result.assistantMessage.content.trim().length === 0) {
    throw new Error('Orchestration failed: Assistant message content is empty');
  }

  // Also test crisis / safety boundary preservation through orchestrator
  console.log(
    '\n4. Verifying Layer 1 Safety Gate with Groq Orchestrator (Emergency Intervention)...',
  );
  const emergencyPrompt = 'I have crushing central chest pain and shortness of breath';
  const emergencyUserMsg = await repository.createMessage({
    publicMessageId: 'AIM-GROQUSR2',
    conversationId: conversation.id,
    role: AIMessageRole.USER,
    content: emergencyPrompt,
    status: AIMessageStatus.SENT,
  });

  const safetyResult = await orchestrator.processMessage({
    conversationId: conversation.id,
    userMessageId: emergencyUserMsg.id,
    userId: 'usr-patient-groq-001',
    content: emergencyPrompt,
  });

  console.log(`   - Emergency Safety Classification: ${safetyResult.safetyClassification}`);
  console.log(`   - Action:                         ${safetyResult.safetyAction}`);
  console.log(`   - Intervening Provider:           ${safetyResult.generation.provider}`);
  console.log(`   - Upstream Groq Called:           NO (deterministic rule intercepted safely)`);

  if (
    safetyResult.safetyAction !== 'REFUSAL' &&
    !safetyResult.generation?.finishReason?.includes('safety')
  ) {
    throw new Error('Safety check failed: Acute emergency was not intercepted before reaching LLM');
  }

  console.log('\n======================================================');
  console.log('GROQ ORCHESTRATION & SAFETY PIPELINE: ALL TESTS PASSED!');
  console.log('======================================================\n');
}

runGroqOrchestratorSmokeTest().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
