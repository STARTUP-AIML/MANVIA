# MANVIA — AI Safety Architecture

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Safety Philosophy

MANVIA AI exists to support user wellness, not to replace medical care. Safety is not a feature that is added at the end — it is designed into every AI interaction from the beginning.

**Core principles:**

1. The AI never claims to be a human doctor.
2. The AI never makes diagnoses or prescribes treatments.
3. The AI detects distress signals and responds with care and appropriate escalation.
4. Emergency resources are displayed only when verified for the user's geography.
5. Every safety event is logged and auditable.
6. Safety architecture is tested as part of every AI phase.

---

## 2. Risk Classification

### 2.1 Content Risk Categories

| Category | Description | Examples |
|---|---|---|
| SELF_HARM_IDEATION | User expresses thoughts of harming themselves | "I want to hurt myself", "I don't want to be here anymore" |
| HARM_TO_OTHERS | User expresses intent to harm others | "I want to hurt someone" |
| SUICIDE_RISK | Explicit or implicit suicidal ideation | "I've been thinking about ending it" |
| SEVERE_DISTRESS | High emotional distress without explicit harm | Expressed hopelessness, crisis |
| MEDICAL_EMERGENCY | User describes acute medical symptoms | "I can't breathe", "I think I'm having a heart attack" |
| SEEKING_DIAGNOSIS | User asks AI to diagnose them | "Do I have diabetes?", "Is this cancer?" |
| MEDICATION_REQUEST | User asks for prescription advice | "What dosage should I take?" |
| EMOTIONAL_DISTRESS | Moderate emotional difficulty | Anxiety, sadness, stress |
| GENERAL_HEALTH_QUESTION | Normal health education query | Low risk |

### 2.2 Risk Levels

| Level | Categories | Immediate Action |
|---|---|---|
| CRISIS | SELF_HARM_IDEATION, SUICIDE_RISK, HARM_TO_OTHERS | Immediate safety response + emergency resources + log |
| HIGH | MEDICAL_EMERGENCY | Safety response + offer doctor escalation + log |
| MEDIUM | SEVERE_DISTRESS | Supportive response + offer human support + log |
| LOW | SEEKING_DIAGNOSIS, MEDICATION_REQUEST | Decline and redirect + log |
| INFORMATIONAL | EMOTIONAL_DISTRESS, GENERAL_HEALTH_QUESTION | Normal handling + log |

---

## 3. Safety Engine Architecture

### 3.1 Processing Pipeline

```
User Message Received
         |
         v
Pre-response Safety Check
(scan user message for risk signals)
         |
    +----+----+
    |         |
    v         v
 LOW/INFO  MEDIUM/HIGH/CRISIS
    |         |
    v         v
 Generate   Safety Override
 Normal     (force safety response)
 Response       |
    |           v
    v       AI Safety Module
 Post-       (select response template)
 response         |
 Safety           v
 Check        CRISIS: Emergency pathway
 (scan AI     HIGH: Escalation offer
 output)      MEDIUM: Supportive + offer
    |
    v
Deliver Response
```

### 3.2 Pre-Response Safety Check

Runs on every user message **before** sending to AI model.

If CRISIS content is detected:
- Do NOT send to the general AI model.
- Route directly to the crisis response system.
- This prevents the general model from generating an unsafe response.

If MEDIUM/HIGH content is detected:
- Add safety-aware context to the system instruction for this request.
- Monitor the AI's response output.

### 3.3 Post-Response Safety Check

Runs on every AI model output **before delivery to user**.

If the AI model generates content that:
- Claims to provide a medical diagnosis
- Provides specific medication dosages
- Contains harmful content

The response is intercepted, replaced with a safe alternative, and the event is logged.

### 3.4 Crisis Intercept Response Time & SLA
* **Measurement Window Baseline:** In voice and streaming audio modalities, the latency clock for crisis intercept begins strictly upon **Voice Activity Detection (VAD) endpointing / utterance completion** (the moment the user ceases speaking and silence is detected), not from the onset of speech.
* **Response SLA:** The safety classification, generation cancellation, and hardcoded crisis response dispatch must execute in under **350ms** from detected utterance completion.
* **Fast-Path Intercept:** When semantic keyword/vector classifiers match a `CRISIS` category, the pipeline immediately aborts foundation model generation, injects the hardcoded crisis audio buffer, and surfaces emergency hotline UI cards simultaneously.

---

## 4. Safety Response Templates

Safety responses must be:
- Empathetic (not robotic or dismissive)
- Non-preachy (not lecturing the user)
- Actionable (offering concrete next steps)
- Honest (the AI acknowledges its limitations)

**Template: CRISIS Response**
```
I'm here with you, and I'm concerned about what you've shared.
This is something where talking to a real person right away can help.

[Emergency Resource Display — LEGAL / REGULATORY REVIEW REQUIRED before activation]

You can also talk to a real doctor through MANVIA. Would you like me to help connect you?
```

**Template: MEDICAL_EMERGENCY Response**
```
What you're describing sounds like it may need immediate medical attention.
Please contact emergency services or go to your nearest emergency room right away.

[Emergency Resource Display]

I'm an AI and I'm not able to assess your condition. Please get help now.
```

**Template: DIAGNOSIS_REQUEST Response**
```
I'm not able to diagnose medical conditions — that's something only a qualified doctor can do.
But I can help you find a MANVIA doctor who can give you proper medical advice.

Would you like to see available doctors right now?
```

---

## 5. Emergency Resources

**CRITICAL — LEGAL / REGULATORY REVIEW REQUIRED**

Emergency resources (crisis helpline numbers, emergency contact information) must be:

1. Verified for the specific target geography before being displayed.
2. Checked for accuracy before every production deployment.
3. Never fabricated or assumed.
4. Stored in the database as configurable resources, not hard-coded.

**The following are PLACEHOLDER values for development only:**

```
Development placeholder:
Emergency: 112 (this number may not be applicable in all jurisdictions)
Crisis support: VERIFY FOR JURISDICTION
```

**Production:** The `emergency_resources` configuration must be populated with verified, jurisdiction-specific, operational phone numbers and services before any production user sees them.

---

## 6. AI Safety Logging

Every safety event is logged to `ai_safety_events` with:
- conversation_id
- message_id
- patient_id
- risk_level
- detected_categories
- whether escalation was triggered
- which emergency resources were displayed
- timestamp

**Retention:** Safety event logs must be retained for the maximum legally required period (LEGAL / REGULATORY REVIEW REQUIRED).

**Access:** Safety events are accessible to MANVIA admins for review. Patients can request their own safety logs through data portability request.

---

## 7. Safety Testing Requirements

Before any AI feature is released to users, safety testing must include:

1. **Red team testing:** Attempt to get the AI to make diagnoses, prescribe, or claim to be human.
2. **Crisis response testing:** Verify that crisis signals are detected and the correct response is delivered.
3. **Escalation testing:** Verify that escalation pathway activates correctly.
4. **Edge case testing:** Ambiguous language, metaphorical statements, non-English inputs.
5. **Regression testing:** After any system instruction or model change, re-run safety test suite.

**DECISION REQUIRED:** Define the formal safety test suite and acceptance criteria before Phase 15.

---

## 8. AI Transparency Requirements

The following must be true in all AI interactions:

- A visible AI indicator must be displayed in the UI whenever the user is interacting with AI.
- The first message in every AI conversation must include an identification: "I'm MANVIA AI..."
- If a user asks "Are you a real doctor?" or "Are you human?", the AI must clearly answer no.
- The AI must not use a human name.
- The AI persona "MANVIA AI" is permissible, but it must never create the impression of human expertise.

---

## 9. Incident Response for AI Safety Events

If a CRISIS-level safety event occurs:

1. Event is logged immediately to `ai_safety_events`.
2. Real-time alert to operations team (DECISION REQUIRED: alerting mechanism).
3. Case review by a designated safety reviewer within 24 hours.
4. If pattern of false positives or missed detections is identified, system instruction and safety classifier are updated.
5. If a user was harmed and MANVIA's AI was a contributing factor: incident response protocol (LEGAL / REGULATORY REVIEW REQUIRED).

---

*AI safety architecture governs all AI phases (15, 16, 17). No AI feature ships without passing the safety test suite.*
