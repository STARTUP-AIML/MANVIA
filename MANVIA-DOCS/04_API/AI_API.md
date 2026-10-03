# MANVIA — AI Companion & Voice Gateway API Specification

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Modalities & Protocol Overview

The AI Companion module exposes two distinct interfaces:
1. **REST / Server-Sent Events (SSE):** For asynchronous and turn-based text conversations (`/api/v1/ai/conversations`).
2. **WebSocket Gateway:** For real-time, bi-directional audio streaming and low-latency voice avatar interaction (`/ws/v1/ai/voice`).

---

## 2. Text Conversation Endpoints (REST / SSE)

### 2.1 Start AI Conversation Session
* **HTTP Method:** `POST /api/v1/ai/conversations`
* **Access:** Patient (`@Roles('PATIENT')`)
* **Request Body:**
```json
{
  "contextType": "GENERAL_WELLNESS",
  "preferredLanguage": "en"
}
```
* **Response `201 Created`:**
```json
{
  "status": "success",
  "data": {
    "conversationId": "conv_992184_uuid",
    "createdAt": "2026-09-28T22:30:00Z"
  }
}
```

---

### 2.2 Send Message & Stream Response (SSE)
* **HTTP Method:** `POST /api/v1/ai/conversations/{conversationId}/messages`
* **Headers:** `Accept: text/event-stream`
* **Request Body:**
```json
{
  "message": "I've been feeling anxious about my upcoming glucose test. What should I expect?"
}
```
* **SSE Stream Events:**
```text
event: token
data: {"token": "It's "}

event: token
data: {"token": "completely natural to feel "}

event: token
data: {"token": "nervous before tests."}

event: done
data: {"messageId": "msg_001", "safetyStatus": "PASSED", "latencyMs": 420}
```

---

## 3. Realtime WebSocket Voice Protocol (`/ws/v1/ai/voice`)

### 3.1 Connection Handshake & Authentication
* **Endpoint:** `wss://api.manvia.com/ws/v1/ai/voice`
* **Query Params:** `?token=<jwt_access_token>&language=en-US`
* **Handshake Packet (Client -> Server):**
```json
{
  "event": "session.init",
  "data": {
    "audioFormat": "audio/pcm;rate=16000",
    "voiceProfile": "EMPATHETIC_CALM",
    "enableAvatarSync": true
  }
}
```

---

### 3.2 Bidirectional Streaming Protocol Events

| Direction | Event Name | Payload Description |
|---|---|---|
| Client -> Server | `audio.chunk` | Binary PCM chunk (16-bit, 16kHz, 50ms frames) |
| Client -> Server | `audio.interrupt` | User spoke while AI was speaking (cancels AI audio output buffer) |
| Server -> Client | `session.ready` | Confirmation of ready state and session token |
| Server -> Client | `transcript.interim` | Interim speech-to-text recognition string |
| Server -> Client | `transcript.final` | Final user utterance transcribed |
| Server -> Client | `audio.chunk` | AI generated audio stream (PCM/Opus) |
| Server -> Client | `avatar.viseme` | Facial viseme morph targets for 3D/2D avatar lipsync |
| Server -> Client | `safety.crisis_intercept`| Immediate crisis protocol takeover with 988 lifeline UI payload |

---

### 3.3 Emergency Human Escalation Flow
If the user indicates they want human doctor intervention, or if safety filters determine that clinical evaluation is imperative:
* **Server -> Client Event:** `ai.escalate_to_doctor`
```json
{
  "event": "ai.escalate_to_doctor",
  "data": {
    "reason": "CLINICAL_RECOMMENDATION",
    "suggestedSpecialty": "Internal Medicine",
    "matchingDoctor": {
      "publicDoctorId": "DOC-90218471",
      "name": "Dr. Rajesh Nair, MD",
      "nextAvailableSlot": "2026-10-02T10:00:00Z"
    }
  }
}
```
Client UI immediately opens the doctor booking modal pre-populated with relevant context.
