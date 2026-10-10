import dotenv from 'dotenv';
dotenv.config({ path: process.cwd().endsWith('backend') ? '.env' : 'backend/.env' });

import { ConfigService } from '../../src/config/config.service.js';
import { GroqAIProvider } from '../../src/modules/ai/providers/groq-ai.provider.js';
import { DEFAULT_AI_SYSTEM_INSTRUCTION } from '../../src/modules/ai/constants/ai.constants.js';

async function runGroqSmokeTest() {
  console.log('\n======================================================');
  console.log('MANVIA — GROQ AI PROVIDER LOCAL SMOKE TEST');
  console.log('======================================================\n');

  const config = new ConfigService();

  // 1. Verify Configuration & Credentials presence without leaking secrets
  console.log('1. Checking Groq configuration:');
  const configuredProvider = config.aiProvider;
  const configuredModel = config.groqModel;
  const hasKey = Boolean(config.groqApiKey && config.groqApiKey.trim().length > 0);
  const keyLength = config.groqApiKey ? config.groqApiKey.length : 0;
  const keyPrefix = config.groqApiKey ? config.groqApiKey.slice(0, 4) + '...' : '(none)';

  console.log(`   - AI_PROVIDER configured as: "${configuredProvider}"`);
  console.log(`   - GROQ_MODEL configured as:    "${configuredModel}"`);
  console.log(
    `   - GROQ_API_KEY present:       ${hasKey ? `YES (prefix: ${keyPrefix}, length: ${keyLength} chars)` : 'NO'}`,
  );

  if (!hasKey) {
    console.error('\n[FAILED] GROQ_API_KEY is not configured in backend/.env.');
    console.error(
      'Please configure GROQ_API_KEY in backend/.env before running live smoke test.\n',
    );
    process.exit(1);
  }

  // 2. Instantiate GroqAIProvider
  console.log('\n2. Initializing GroqAIProvider adapter...');
  const groqProvider = new GroqAIProvider(config);

  // 3. Send simple synthetic prompt as specified in section 10
  const syntheticPrompt = 'Reply with exactly: MANVIA GROQ TEST SUCCESS';
  console.log(`\n3. Sending synthetic prompt to Groq API: "${syntheticPrompt}"...`);

  const startTime = performance.now();
  try {
    const response = await groqProvider.generateResponse({
      systemInstruction: DEFAULT_AI_SYSTEM_INSTRUCTION,
      messages: [
        {
          role: 'user',
          content: syntheticPrompt,
        },
      ],
      userContext: {
        userId: 'smoke-test-patient-001',
        preferredName: 'TestUser',
        locale: 'en-US',
      },
      temperature: 0.2,
      maxTokens: 50,
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    console.log('\n4. Provider Response Received:');
    console.log(`   - Provider:             ${response.provider}`);
    console.log(`   - Model:                ${response.model}`);
    console.log(
      `   - Roundtrip Latency:    ${elapsedMs} ms (Provider reported: ${response.latencyMs} ms)`,
    );
    console.log(
      `   - Token Usage:          Prompt: ${response.usage.promptTokens}, Completion: ${response.usage.completionTokens}, Total: ${response.usage.totalTokens}`,
    );
    console.log(`   - Finish Reason:        ${response.finishReason}`);
    console.log(`   - Is AI Generated:      ${response.isAiGenerated}`);
    console.log(`   - Disclosure Attached:  ${Boolean(response.disclosureNotice)}`);
    console.log(`   - Response Content:     "${response.content.trim()}"`);

    // 5. Verification checks
    if (!response.content || response.content.trim().length === 0) {
      throw new Error('Verification failed: Groq returned an empty response string');
    }

    if (response.provider !== 'groq') {
      throw new Error(`Verification failed: Expected provider "groq", got "${response.provider}"`);
    }

    console.log('\n======================================================');
    console.log('GROQ AI PROVIDER SMOKE TEST: SUCCESS!');
    console.log('======================================================\n');
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startTime);
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`\n[FAILED] Groq live request failed after ${elapsedMs} ms:`);
    console.error(`Error details: ${msg}\n`);
    process.exit(1);
  }
}

runGroqSmokeTest().catch((err) => {
  console.error('Unexpected error running smoke test:', err);
  process.exit(1);
});
