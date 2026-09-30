# MANVIA — Phases 15, 16 & 17 Implementation Specification

> **Module**: AI Companion Core, Medical RAG, AI Safety, AI Memory, Realtime Voice & Human Handoff  
> **Status**: COMPLETED & VERIFIED  
> **Repository**: MANVIA Backend (`d:/MY PROJECTS/MANVIA/MANVIA/backend`)  
> **Branch**: `feature/phase-15-ai-companion-core`  
> **Target Baseline**: NestJS Fastify Modular Monolith (Phases 0–13 Integrated)  

---

## 1. Architectural Overview & Boundaries

The MANVIA AI subsystem provides a conversational wellness companion designed to support patients throughout their healthcare journey without crossing into clinical practice.

```
                                  +---------------------------------------+
                                  |            Authenticated User         |
                                  +---------------------------------------+
                                                      |
                                                      v
                                        +---------------------------+
                                        |   AI Companion Controller |
                                        +---------------------------+
                                                      |
         +--------------------------------------------+--------------------------------------------+
         |                       |                    |                    |                       |
         v                       v                    v                    v                       v
+------------------+   +------------------+  +------------------+  +------------------+  +-------------------+
| AISafetyService  |   | MedicalRAGService|  | AIMemoryService  |  |AIRealtimeService |  | AIHandoffService  |
| - Pre/Post check |   | - Vector/Keyword |  | - User pref/goal |  | - State machine  |  | - Doctor queue    |
| - Classification |   |   evidence search|  | - Scope isolation|  | - WebRTC/WS token|  | - Urgency triage  |
| - Emergency route|   | - Source citation|  | - Ephemeral ctx  |  | - Turn-taking    |  | - Acceptance flow |
+------------------+   +------------------+  +------------------+  +------------------+  +-------------------+
         |                       |                    |                    |                       |
         v                       v                    v                    v                       v
+------------------+   +------------------+  +------------------+  +------------------+  +-------------------+
|  AISafetyEvent   |   | AIMedicalSource  |  |    AIMemory      |  |AIRealtimeSession |  |  AIHumanHandoff   |
| (Database Table) |   | AIMedicalChunk   |  | (Database Table) |  | (Database Table) |  | (Database Table)  |
+------------------+   +------------------+  +------------------+  +------------------+  +-------------------+
```

### Strict Non-Clinical Boundary
1. **Never a Doctor**: The system is explicitly identified as an AI wellness companion, not a human physician.
2. **No Diagnosis & No Prescription**: It does not render formal diagnoses, prescribe medications, or replace medical advice.
3. **Emergency Routing**: Urgent symptoms (e.g., chest pain, difficulty breathing, stroke signs, anaphylaxis) trigger immediate emergency routing to local emergency dispatchers based on the user's locale (911 for US, 112 for EU/IN, 999 for UK, 000 for AU, 111 for NZ).
4. **Human Handoff**: Patients experiencing complex, unresolved, or concerning issues can be escalated to verified human doctors through a structured handoff queue.

---

## 2. Core Capabilities Implemented

### Phase 15: AI Companion Core
- **Conversation Lifecycle**: Create, list, retrieve, and soft-delete user conversations.
- **Message Exchange**: Bidirectional chat with context history retention.
- **Provider Abstraction**: Extensible `AIProvider` contract with deterministic `MockAIProvider` for test reproducibility and cost-controlled dev environments.
- **Orchestration**: System prompt injection, context window trimming, token usage calculation, and audit logging.
- **User Feedback**: Message-level rating (POSITIVE / NEGATIVE / INACCURATE / HARMFUL) with optional commentary.

### Phase 16: Medical RAG, AI Safety & AI Memory
- **Medical RAG (`MedicalRAGService`)**:
  - Evidence retrieval over validated medical literature and clinical guidelines.
  - Multi-chunk retrieval with similarity thresholds and keyword fallback.
  - Granular citation metadata (`[source: X, chunk: Y]`) linked to verified sources.
  - Deterministic `MockMedicalRetriever` containing mock guidelines (hypertension, diabetes, hydration, sleep hygiene).
- **AI Safety & Policy Guardrails (`AISafetyService`)**:
  - Dual-phase evaluation: Pre-generation (user input) and Post-generation (model response).
  - Classifications: `SAFE`, `AMBIGUOUS`, `UNSAFE`, `MEDICAL_EMERGENCY`, `SELF_HARM`, `HARASSMENT`, `PRESCRIPTION_REQUEST`, `DIAGNOSIS_REQUEST`.
  - Enforced Actions: `ALLOW`, `BLOCK`, `REDIRECT_TO_EMERGENCY`, `WARN_DISCLAIMER`, `HANDOFF_TO_DOCTOR`.
  - Locale-aware emergency numbers (US: 911, EU/IN: 112, UK: 999, AU: 000, NZ: 111).
  - Telemetry & Audit: Safety violations logged without storing raw sensitive text snippets.
- **AI Memory (`AIMemoryService`)**:
  - Structured patient memory persistence across categories: `PREFERENCE`, `WELLNESS_GOAL`, `HEALTH_HABIT`, `COMMUNICATION_STYLE`.
  - Strict user-level tenant isolation: Patient A cannot read or modify Patient B's memories.
  - Granular controls: List, create, and delete memories for complete user data agency.

### Phase 17: Realtime Voice + Avatar + Human Handoff
- **Realtime Voice Sessions (`AIRealtimeService`)**:
  - WebRTC signaling / WebSocket transport abstraction via `RealtimeAIProvider`.
  - Full session lifecycle: `CONNECTING` -> `CONNECTED` -> `LISTENING` -> `SPEAKING` -> `INTERRUPTED` -> `CLOSED`.
  - Turn-taking & Barge-in: Immediate speech interruption cancellation (`interruptSession`).
  - Strict State Machine: Invalid state transitions throw descriptive `ValidationError`s.
- **Human Handoff (`AIHandoffService`)**:
  - Multi-tier urgency escalation (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - Patient handoff initiation with optional targeted doctor or general pool.
  - Doctor queue: Verified doctors inspect pending handoffs and accept them (`ACCEPT`).
  - Handoff status transitions: `PENDING` -> `ASSIGNED` / `ACCEPTED` / `RESOLVED` / `CANCELLED`.

---

## 3. Database Schema Extensions

Applied via migration `20260930060000_phase16_17_rag_safety_memory_realtime_handoff`:

```prisma
enum AISafetyClassification {
  SAFE
  AMBIGUOUS
  UNSAFE
  MEDICAL_EMERGENCY
  SELF_HARM
  HARASSMENT
  PRESCRIPTION_REQUEST
  DIAGNOSIS_REQUEST
}

enum AISafetyAction {
  ALLOW
  BLOCK
  REDIRECT_TO_EMERGENCY
  WARN_DISCLAIMER
  HANDOFF_TO_DOCTOR
}

enum AIMemoryCategory {
  PREFERENCE
  WELLNESS_GOAL
  HEALTH_HABIT
  COMMUNICATION_STYLE
}

enum AIMemoryStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

enum AIRealtimeState {
  INITIALIZING
  CONNECTING
  CONNECTED
  LISTENING
  SPEAKING
  INTERRUPTED
  CLOSED
  FAILED
}

enum AIHandoffStatus {
  PENDING
  ACCEPTED
  RESOLVED
  CANCELLED
}

enum AIHandoffUrgency {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

Tables added:
- `ai_medical_sources`: Curated medical knowledge repositories (WHO, CDC, Mayo Clinic).
- `ai_medical_documents`: Specific clinical articles, guidelines, or chapters.
- `ai_medical_chunks`: Text segments and vector embeddings for semantic retrieval.
- `ai_safety_events`: Telemetry records of flagged safety incidents with locale and action taken.
- `ai_memories`: Long-term user preferences and wellness goals.
- `ai_realtime_sessions`: Voice session states, transport tokens, and barge-in metrics.
- `ai_human_handoffs`: Escalation tickets linking patient, conversation, and responding doctor.

---

## 4. API Endpoints

All endpoints are hosted under `/api/v1/ai` and protected by authentication guards:

| Method | Path | Roles | Description |
|---|---|---|---|
| `POST` | `/api/v1/ai/conversations` | PATIENT, ADMIN | Start new AI conversation |
| `GET` | `/api/v1/ai/conversations` | PATIENT, ADMIN | List user's conversations |
| `GET` | `/api/v1/ai/conversations/:id` | PATIENT, ADMIN | Retrieve conversation with messages |
| `DELETE`| `/api/v1/ai/conversations/:id` | PATIENT, ADMIN | Delete conversation |
| `POST` | `/api/v1/ai/conversations/:id/messages` | PATIENT, ADMIN | Send user message & get AI response |
| `POST` | `/api/v1/ai/messages/:id/feedback` | PATIENT, ADMIN | Submit feedback on response |
| `POST` | `/api/v1/ai/safety/check` | ANY AUTH | Perform pre/post-generation safety check |
| `POST` | `/api/v1/ai/rag/retrieve` | ANY AUTH | Retrieve medical evidence chunks |
| `POST` | `/api/v1/ai/memories` | PATIENT, ADMIN | Store long-term user memory |
| `GET` | `/api/v1/ai/memories` | PATIENT, ADMIN | List user's active memories |
| `DELETE`| `/api/v1/ai/memories/:id` | PATIENT, ADMIN | Delete memory entry |
| `POST` | `/api/v1/ai/realtime/session` | PATIENT, ADMIN | Initiate realtime voice session |
| `GET` | `/api/v1/ai/realtime/session/:id` | PATIENT, ADMIN | Get session status & transport info |
| `POST` | `/api/v1/ai/realtime/session/:id/transition` | PATIENT, ADMIN | Advance state machine |
| `POST` | `/api/v1/ai/realtime/session/:id/interrupt` | PATIENT, ADMIN | Trigger user barge-in / speech cut |
| `POST` | `/api/v1/ai/realtime/session/:id/end` | PATIENT, ADMIN | Terminate voice session |
| `POST` | `/api/v1/ai/handoffs` | PATIENT, ADMIN | Request human handoff |
| `GET` | `/api/v1/ai/handoffs` | PATIENT, ADMIN | List patient's handoffs |
| `GET` | `/api/v1/ai/handoffs/:id` | PATIENT, ADMIN | Get handoff status |
| `POST` | `/api/v1/ai/handoffs/:id/cancel` | PATIENT, ADMIN | Cancel pending handoff |
| `GET` | `/api/v1/ai/doctor/handoffs` | DOCTOR | Doctor views pending handoffs queue |
| `POST` | `/api/v1/ai/doctor/handoffs/:id/accept` | DOCTOR | Doctor accepts handoff |

---

## 5. Security & Privacy Guarantees

1. **Multi-Tenant Isolation**: Every database read/write enforces ownership checks (`userId` match or authorized doctor role).
2. **PII & Sensitive Data Redaction**: Audit logs strictly omit raw message content and user health descriptions (`metadata.contentSnippet: undefined`).
3. **No Direct Model Access**: Clients never interact directly with third-party LLMs or vector databases; all access is mediated by the backend orchestrator and guards.
4. **Idempotency & Safe IDs**: Queries accept both UUIDs and public prefixed IDs (`MEM-...`, `RTS-...`, `AIH-...`) with format guards preventing database type casting exceptions.

---

## 6. Implementation Status (MOCKED vs IMPLEMENTED)

| Component | Status | Details |
|---|---|---|
| AI Companion Service & Controller | **IMPLEMENTED** | Full business logic, database persistence, audit logging |
| Medical RAG Service & Citation Engine | **IMPLEMENTED** | Vector + keyword fallback logic, citation formatting |
| Medical Retriever Provider | **MOCKED** | `MockMedicalRetriever` provides deterministic evidence for CI/CD |
| AI Safety Service & Policy Guardrails | **IMPLEMENTED** | Locale routing table, safety classifier evaluation, audit logging |
| Safety Classifier Provider | **MOCKED** | `MockSafetyClassifier` identifies emergencies, self-harm, prescriptions |
| AI Memory Service & Tenant Isolation | **IMPLEMENTED** | CRUD operations, cross-user isolation, context formatting |
| Realtime Service & State Machine | **IMPLEMENTED** | Transition validation, barge-in counting, session persistence |
| Realtime Voice Provider | **MOCKED** | `MockRealtimeProvider` issues mock WebRTC/WebSocket tokens |
| Human Handoff Service & Doctor Triage | **IMPLEMENTED** | Queue management, doctor profile verification, state transitions |
