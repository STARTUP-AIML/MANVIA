# MANVIA — AI Architecture

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. AI Architecture Philosophy

### ADR-005: Provider Abstraction for AI Models

**Problem:** Healthcare AI platforms that hard-code a single AI provider (e.g., directly importing the OpenAI SDK in every service) cannot switch providers without large-scale refactoring. AI provider pricing, capabilities, and availability change rapidly.

**Decision:** All AI interaction goes through a provider abstraction layer. Only `src/integrations/ai/` imports provider-specific SDKs. All modules call the `AIOrchestrator` service.

**Benefits:**
- Provider can be swapped per model type (general chat vs. voice vs. medical reasoning).
- New models can be added without changing business logic.
- Cost controls can be applied in one place.
- Provider failover can be implemented centrally.

**Critical rule:** The MANVIA AI is transparently an AI. It must never be presented as a human doctor. It must never make diagnoses, prescribe medications, or claim clinical authority.

---

## 2. AI System Architecture

```
Patient (text or voice)
         |
         v
  AI CONVERSATION MODULE
  (manages conversation state, memory, context)
         |
         v
  AI ORCHESTRATOR
  (selects model, applies system instructions, enforces safety)
         |
    +----+----+----+
    |         |    |
    v         v    v
 General   Voice  Medical
 Reasoning Voice  Reasoning
 Model     Model  Model
 (Gemini/  (OAI   (TBD)
  OpenAI)   RT)
    |         |    |
    +----+----+----+
         |
         v
  SAFETY ENGINE
  (risk detection, crisis routing)
         |
    +----+----+
    |         |
    v         v
 Response   ESCALATION
 delivered  PATHWAY
            |
            v
         HUMAN CARE
         (appointment booking)
```

---

## 3. Provider Abstraction Layer

### 3.1 Core Interfaces

```typescript
// src/integrations/ai/interfaces/ai-provider.interface.ts

interface AIProvider {
  readonly providerName: string;
  readonly modelId: string;
  
  generateText(request: AITextRequest): Promise<AITextResponse>;
  streamText(request: AITextRequest): AsyncIterable<AITextChunk>;
}

interface AIEmbeddingProvider {
  readonly providerName: string;
  
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}

interface AIVoiceProvider {
  readonly providerName: string;
  
  transcribe(audio: AudioStream): AsyncIterable<TranscriptChunk>;
  synthesize(text: string, voice: VoiceConfig): AsyncIterable<AudioChunk>;
}

interface AIRequest {
  systemInstruction: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  tools?: AITool[];
  safetySettings?: AISafetySettings;
}

interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'TOOL_CALL';
  safetyRatings?: AISafetyRating[];
}

interface AIStreamChunk {
  delta: string;
  finishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY';
}
```

### 3.2 Model Configuration

Models are configured per use case, not per provider:

```typescript
enum AIModelPurpose {
  GENERAL_CONVERSATION = 'GENERAL_CONVERSATION',
  MEDICAL_REASONING = 'MEDICAL_REASONING',
  VOICE_INTERACTION = 'VOICE_INTERACTION',
  EMBEDDING = 'EMBEDDING',
  SAFETY_EVALUATION = 'SAFETY_EVALUATION',
}
```

The `AIOrchestrator` selects the configured provider for each purpose. This allows:
- General conversation: Gemini Pro / GPT-4
- Voice: OpenAI Realtime API / Gemini Live
- Medical RAG: specialized model (DECISION REQUIRED)
- Embeddings: text-embedding-ada-002 / Google text-embedding-004
- Safety: dedicated safety model or same general model with safety-focused prompts

---

## 4. System Instruction Layer

Every AI request includes a carefully crafted system instruction. The system instruction is the primary control over AI behavior.

### 4.1 Core System Instruction Principles

The system instruction must:

1. **Identify MANVIA AI as AI.** "You are MANVIA AI, an AI wellness companion. You are not a human doctor."
2. **Prohibit diagnostic claims.** "You must never diagnose medical conditions or recommend specific treatments or medications."
3. **Enforce scope.** "You support wellness, health education, and general wellbeing. For medical advice, direct users to consult a real doctor."
4. **Enable escalation.** "If a user shows signs of distress, mentions harm to self or others, or asks for urgent medical help, escalate to the safety system immediately."
5. **Maintain transparency.** "If asked whether you are a human, always confirm you are an AI."
6. **Multilingual.** "Respond in the language the user initiates the conversation in."

### 4.2 System Instruction Versioning

System instructions are versioned and stored in the database. Each conversation records which version of the system instruction was active. This allows:
- Audit trail of AI behavior over time.
- A/B testing of instruction variations.
- Rollback if an instruction change causes safety issues.

---

## 5. AI Memory Architecture

### 5.1 Short-term Memory (Within Session)

The full conversation history is included in every API call (within token limits). The AI has full context of the current conversation.

### 5.2 Long-term Memory (Cross-session)

Persistent AI memory stores distilled facts about the user across conversations:
- Wellness patterns (if consented)
- User preferences
- Previous topics discussed
- Care goals

**Privacy rule:** AI memory storage requires explicit user consent. Users can view, edit, and delete their AI memory.

**Implementation:** Stored in `ai_memory` table; relevant memories are retrieved at conversation start and included in context.

### 5.3 RAG (Retrieval Augmented Generation)

Phase 16 introduces Medical RAG:
- Curated medical knowledge base (vetted sources — DECISION REQUIRED)
- Documents indexed with embeddings in pgvector
- Relevant documents retrieved per user query
- Retrieved documents included in context alongside system instruction

**Critical:** RAG documents must be from verified, appropriate medical sources. The RAG system must not return diagnostic content as if it were personalized medical advice.

---

## 6. AI Safety Architecture

See detail: [AI_Safety.md](AI_Safety.md)

### 6.1 Safety Evaluation Layer

Every AI response goes through the safety engine before delivery:

```
AI Model Response
       |
       v
Safety Engine
       |
  +----+----+
  |         |
  v         v
SAFE     FLAGGED
  |         |
  v         v
Deliver   Risk Assessment
          |
     +----+----+
     |         |
     v         v
  Log      Escalate
  Only     |
           v
        Crisis Pathway
```

### 6.2 Risk Levels

| Level | Description | Action |
|---|---|---|
| LOW | General emotional content | Log; no action |
| MEDIUM | Signs of distress, anxiety, unhappiness | Flag; monitor; add supportive messaging |
| HIGH | Expressions of self-harm ideation, severe distress | Safety response + offer human support |
| CRISIS | Explicit self-harm or harm to others | Immediate safety response + emergency resources + log |

### 6.3 Safety Engine Components

- **Content classifier:** Detects risk categories in user messages.
- **Response filter:** Ensures AI response is appropriate given detected risk.
- **Escalation trigger:** Initiates the human care pathway when threshold is met.
- **Safety event logger:** Writes to `ai_safety_events` with full context.
- **Emergency resource display:** Shows verified crisis resources — **LEGAL / REGULATORY REVIEW REQUIRED** before any crisis resources are displayed. Numbers must be verified for the target geography.

---

## 7. AI Tool Calling

The AI can call predefined tools within the platform. Tools must:
- Follow the same authorization model as REST APIs.
- Never bypass consent or care relationship requirements.
- Be explicitly defined and versioned.
- Log every tool invocation.

**Example tools:**
- `getWellnessHistory` — retrieve user's wellness check-in trends (patient-consented)
- `bookAppointment` — initiate appointment flow (patient-triggered only)
- `escalateToHuman` — trigger human care pathway
- `getEmergencyResources` — retrieve verified crisis resources for user's geography

---

## 8. AI Observability

Every AI interaction must be observable:

| Metric | Description |
|---|---|
| Token usage | Input tokens, output tokens, total per request |
| Model used | Provider + model ID for every response |
| Response latency | Time from request to first token, total time |
| Safety flags | Count and categories of flagged content |
| Escalations | Count and reasons for human escalation |
| Errors | Provider errors, timeout rate |
| Cost | Estimated cost per conversation, per day |

Cost controls:
- Max tokens per request (configurable)
- Max conversations per user per day (configurable)
- Circuit breaker on provider errors
- Provider failover on availability failure

---

## 9. Multilingual AI

The AI must support multilingual interaction.

**Requirements:**
- Detect user language from first message.
- Maintain the same language throughout the conversation.
- System instruction guides language-matching behavior.
- AI memory stores user's preferred language.

**Languages:** DECISION REQUIRED — define the priority language list for initial launch based on OD-011 (target geography).

**Voice language support:** Additional constraint because voice models have more limited language support than text models. Voice language coverage must be verified for each selected provider before committing to voice feature availability in a language.

---

## 10. Human Escalation (AI to Doctor)

### 10.1 Escalation Triggers

1. **User-requested:** User explicitly says "I want to see a real doctor."
2. **Safety-triggered:** Safety engine detects HIGH or CRISIS risk.
3. **AI-initiated:** AI determines the query is outside its scope and recommends professional consultation.

### 10.2 Escalation Flow

```
Escalation Trigger
       |
       v
AI Conversation marked ESCALATED
       |
       v
HandoffEvent published
       |
       v
Doctor Appointment Module
       |
       v
Show available doctors to user
       |
       v
User proceeds to appointment booking flow
```

**Key principle:** The AI never automatically books an appointment. It initiates the escalation pathway, but the user confirms the appointment booking. No automatic medical decisions.

---

## 11. AI Evaluation and Feedback

- Users can rate AI responses (thumbs up/down).
- Feedback stored in `ai_feedback` table.
- Low-rated responses flagged for review.
- Response quality evaluation: DEFERRED — requires dedicated evaluation pipeline.
- Model performance regression detection: DEFERRED — requires evaluation harness.

---

## 12. AI Provider Failover

If the primary AI provider fails:
1. Detect failure via error rate threshold or circuit breaker.
2. Switch to configured fallback provider.
3. Log failover event.
4. Alert operations team.
5. Resume on primary when recovered.

**DECISION REQUIRED:** Define primary and fallback providers once OD-003 is resolved.

---

*AI implementation begins in Phase 15. This document governs all AI architectural decisions.*
