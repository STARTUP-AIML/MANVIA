# MANVIA — AI Model Strategy

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Strategy Overview

MANVIA does not commit to a single AI model or provider. Instead:

- Models are selected per use case (general chat, voice, RAG, embeddings, safety).
- All models are accessed through the provider abstraction layer.
- Providers can be switched without changing business logic.
- Provider decisions (OD-003) are resolved when Phase 15 development begins.

---

## 2. Model Use Cases

| Use Case | Purpose | Candidate Providers |
|---|---|---|
| General Conversation | Patient wellness chat | Gemini Pro, GPT-4o, Claude 3.5 Sonnet |
| Voice Interaction | Real-time voice + STT + TTS | OpenAI Realtime API, Gemini Live |
| Medical RAG Retrieval | Clinical knowledge retrieval | Embedding model (separate) |
| Embeddings | Document indexing for pgvector | text-embedding-004, text-embedding-ada-002 |
| Safety Evaluation | Content risk classification | Gemini safety API, GPT-4o, dedicated safety model |
| Translation | Multilingual support | Provider-native translation or dedicated service |

**DECISION REQUIRED (OD-003):** Finalize primary and fallback providers per use case before Phase 15.

---

## 3. Provider Evaluation Criteria

When selecting a provider for each use case, evaluate:

1. **Latency:** Time to first token for chat; end-to-end latency for voice.
2. **Language support:** Coverage for target market languages.
3. **Cost:** Token cost at projected message volume.
4. **Data residency:** Where prompts and responses are processed. LEGAL / REGULATORY REVIEW REQUIRED.
5. **Safety controls:** Provider-level content moderation capability.
6. **Reliability:** SLA, historical uptime.
7. **Healthcare suitability:** Any restrictions on healthcare use in provider TOS.

---

## 4. Medical Knowledge Base (RAG)

The RAG medical knowledge base must consist of:

- Vetted, authoritative medical sources only.
- Content reviewed by qualified medical professionals. LEGAL / REGULATORY REVIEW REQUIRED.
- Content that is appropriate for wellness education — not clinical decision support.
- Clearly documented sources for every ingested document.
- Regular review and update cycle.

**DECISION REQUIRED:** Define the initial knowledge base sources, review process, and update cadence before Phase 16.

**Critical restriction:** RAG retrieval results must be framed as educational information, not as personalized medical advice.

---

## 5. Model Versioning

- Model versions are pinned in configuration, not hard-coded.
- Model version is logged in every AI message record.
- Upgrading a model version requires safety regression testing before production.
- Rollback to previous model version must be possible within one deployment cycle.

---

## 6. Cost Controls

- Max tokens per request: configurable per model use case.
- Max conversations per user per day: configurable.
- Total daily spend limit: configurable; alerting on threshold.
- Cost attribution per conversation: logged for monitoring.
- Circuit breaker: if provider spend exceeds threshold, pause AI features and alert.

---

## 7. Evaluation and Continuous Improvement

**DEFERRED** (Phase 16+): Formal AI evaluation pipeline.

At minimum, the evaluation framework should assess:
- Response relevance and helpfulness
- Safety compliance (never diagnoses, never prescribes)
- Language accuracy for multilingual responses
- Escalation trigger accuracy

---

*Provider selection is DECISION REQUIRED (OD-003) before Phase 15 begins.*
