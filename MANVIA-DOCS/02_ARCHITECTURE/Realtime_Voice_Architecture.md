# MANVIA — Realtime Voice Architecture

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Realtime Voice Philosophy

Realtime AI voice interaction is one of the most technically demanding features of MANVIA. It involves:

- Continuous microphone capture
- Voice activity detection (VAD)
- Audio streaming to server
- AI processing and response generation
- Speech synthesis streaming
- Avatar synchronization
- Barge-in (interruption) handling
- Reconnection management

**Honest assessment:** This feature has significant latency challenges. The perceived quality of a voice AI system is determined almost entirely by latency. Do not promise specific latency figures until benchmarks are measured in production conditions.

---

## 2. Voice State Machine

```
IDLE
 |
 v (user activates voice mode)
LISTENING
 |
 v (speech detected via VAD)
[Still LISTENING — recording]
 |
 v (end of speech detected)
PROCESSING
 |
 v (AI generates response)
SPEAKING
 |
 +-- (user interrupts / barge-in)
 |         |
 |         v
 |    INTERRUPTED
 |         |
 |         v
 |    LISTENING (resume)
 |
 v (AI finishes speaking)
LISTENING (ready for next input)

Additional states:
PAUSED    -- User pauses the interaction
MUTED     -- User mutes microphone
RECONNECTING -- WebSocket connection lost; attempting reconnect
ERROR     -- Unrecoverable error; show fallback UI
HANDOFF_TO_HUMAN -- Escalation triggered; voice ends
```

### State Transitions

| From | Trigger | To |
|---|---|---|
| IDLE | User activates voice | LISTENING |
| LISTENING | VAD detects speech start | LISTENING (audio capture begins) |
| LISTENING | VAD detects speech end | PROCESSING |
| LISTENING | User mutes | MUTED |
| LISTENING | User pauses | PAUSED |
| PROCESSING | AI starts streaming | SPEAKING |
| SPEAKING | User interrupts | INTERRUPTED |
| INTERRUPTED | Interrupt processed | LISTENING |
| SPEAKING | AI finishes | LISTENING |
| ANY | Connection lost | RECONNECTING |
| RECONNECTING | Connection restored | Previous state |
| RECONNECTING | Max retries exceeded | ERROR |
| ANY | Safety escalation | HANDOFF_TO_HUMAN |

---

## 3. Latency Budget

**DECISION REQUIRED:** Measure and define acceptable latency thresholds before Phase 17 commitment.

| Metric | Description | Target (TBD) |
|---|---|---|
| VAD start latency | Time from speech start to VAD detection | < 100ms |
| End-of-speech latency | Time from speech end to PROCESSING trigger | < 300ms |
| Time to first AI token | Server receives audio → first response token | < 1.5s |
| Time to first audio | First AI token → first audio playback | < 500ms |
| Barge-in latency | User interrupts → AI audio stops | < 200ms |
| Reconnect latency | Connection lost → restored and state recovered | < 3s |

**Reality check:** These targets are aspirational. Actual achievable latency depends on:
- Network conditions (mobile 4G/5G vs. WiFi)
- AI provider processing speed
- Speech synthesis speed
- Geographic distance to servers

The voice feature must be designed with graceful degradation — if latency is unacceptable, the system should suggest switching to text mode.

---

## 4. Technical Architecture

### 4.1 Audio Pipeline

```
Client Microphone
       |
       v (capture PCM audio, 16kHz, 16-bit)
VAD (client-side preferred)
       |
       v (speech chunk)
WebSocket Connection
       |
       v
MANVIA Backend (realtime module)
       |
       v
Speech-to-Text Provider (streaming)
       |
       v (transcript)
AI Orchestrator
       |
       v (streamed text response)
Text-to-Speech Provider (streaming)
       |
       v (audio chunks)
WebSocket back to client
       |
       v
Audio playback + Avatar sync
```

### 4.2 Client-Side VAD (Preferred)

Voice Activity Detection should run on the client (browser or mobile) to:
- Reduce server load.
- Reduce network traffic (only speech, not silence, is streamed).
- Lower end-to-end latency.

If client-side VAD is insufficient, server-side VAD is a fallback.

**DECISION REQUIRED (OD-008):** Select VAD library for web and mobile clients.

### 4.3 Barge-In Implementation

When the user speaks while the AI is speaking:
1. Client VAD detects speech.
2. Client sends `INTERRUPT` event over WebSocket immediately.
3. Server receives INTERRUPT:
   - Stops audio generation immediately.
   - Discards any buffered audio.
   - Cancels or ignores the rest of the AI streaming response.
   - Transitions to LISTENING state.
4. Client stops audio playback immediately on receiving INTERRUPTED state.
5. Avatar stops speaking animation.

**Critical:** Barge-in must feel instantaneous. Any delay makes the experience feel broken.

---

## 5. WebSocket Protocol

### Connection
```
wss://api.manvia.com/api/v1/ai/voice
Authorization: Bearer <access_token>
```

### Client → Server Messages

```json
// Start voice session
{ "type": "START", "conversationId": "uuid", "language": "en-IN" }

// Audio chunk (base64 encoded PCM)
{ "type": "AUDIO_CHUNK", "data": "<base64>", "sampleRate": 16000 }

// User interrupted the AI
{ "type": "INTERRUPT" }

// User manually ends the session
{ "type": "END" }

// User pauses
{ "type": "PAUSE" }

// User resumes
{ "type": "RESUME" }
```

### Server → Client Messages

```json
// State change
{ "type": "STATE", "state": "LISTENING" }

// User transcript (for display)
{ "type": "USER_TRANSCRIPT", "text": "...", "isFinal": true }

// AI transcript (for display and accessibility)
{ "type": "ASSISTANT_TRANSCRIPT", "text": "...", "delta": "..." }

// AI audio chunk
{ "type": "AUDIO_CHUNK", "data": "<base64>", "format": "pcm16" }

// Safety flag
{ "type": "SAFETY_FLAG", "level": "HIGH", "resources": [...] }

// Escalation initiated
{ "type": "HANDOFF", "reason": "USER_REQUEST", "appointmentFlowUrl": "/appointments/new" }

// Error
{ "type": "ERROR", "code": "STT_UNAVAILABLE", "message": "..." }
```

---

## 6. Avatar Architecture

**DECISION REQUIRED (OD-014):** Avatar provider selection.

### Requirements

- Avatar must visually synchronize with AI speech (lip sync).
- When AI is interrupted, avatar stops speaking immediately (matches barge-in).
- Avatar represents MANVIA AI, not a specific human.
- Avatar must be clearly identified as a digital entity (consistent with AI transparency requirement).

### Integration Approach

The avatar integration lives in `src/integrations/avatar/`. It receives:
- Audio chunks (for lip sync data)
- State changes (SPEAKING, LISTENING, INTERRUPTED)

The actual avatar rendering is client-side. The server provides the audio stream and state events; the client drives the avatar animation.

---

## 7. Reconnection Handling

If the WebSocket connection drops during a voice session:

1. Client attempts reconnect with exponential backoff.
   - Attempt 1: 1 second
   - Attempt 2: 2 seconds
   - Attempt 3: 4 seconds
   - Maximum 5 attempts before ERROR state.

2. On reconnect, client sends: `{ "type": "RESUME", "conversationId": "uuid", "lastEventId": "..." }`

3. Server recovers conversation state and resumes from last coherent point.

4. If reconnect fails: UI shows fallback to text mode.

---

## 8. Privacy Considerations

- Voice audio is processed in real-time and should not be permanently stored without explicit user consent.
- If voice data is retained for quality improvement: LEGAL / REGULATORY REVIEW REQUIRED.
- Voice transcripts are stored as AI conversation messages (same policy as text).
- Users must be informed that voice is being processed by AI systems.

---

## 9. Phase 17 Pre-Conditions

Before Phase 17 can be completed:

- [ ] OD-003 (AI provider) resolved — voice provider selected
- [ ] OD-014 (Avatar provider) resolved or deferred
- [ ] OD-011 (Target geography) resolved for language prioritization
- [ ] Latency benchmarks from AI provider measured
- [ ] Safety testing for voice mode completed
- [ ] Accessible fallback to text mode available

---

*Realtime voice is the highest-complexity feature in MANVIA. It must not be rushed. If latency benchmarks do not meet thresholds, consider launching with text-only AI and adding voice post-launch.*
