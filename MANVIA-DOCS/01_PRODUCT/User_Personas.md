# MANVIA — User Personas & Clinical / User Stakeholders

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Overview & Behavioral Archetypes

MANVIA caters to distinct personas spanning proactive wellness seekers, patients managing chronic/acute conditions, busy medical doctors, and platform clinical administrators. Each persona has unique trust requirements, technical familiarity, accessibility constraints, and regulatory considerations.

```
       +-------------------------------------------------------+
       |                  MANVIA Platform                      |
       +-------------------------------------------------------+
               |                       |                     |
               v                       v                     v
     [Patient Personas]       [Doctor Personas]     [Admin / Ops]
     - Priya (Chronic)        - Dr. Rajesh (MD)     - Clinical Auditor
     - Marcus (Wellness)      - Dr. Elena (Specialist)- Trust & Safety Officer
     - Sarah (Caregiver)
```

---

## 2. Patient Archetypes

### Persona 1: Priya Sharma — The Chronic Condition Manager
* **Demographics:** 42, Working Parent, living in an urban metro area.
* **Health Context:** Diagnosed with Type 2 Diabetes and Mild Hypertension 3 years ago.
* **Goals:**
  * Track daily vitals, fasting glucose, and blood pressure with minimal friction.
  * Receive empathetic, non-judgmental guidance when lifestyle slips occur.
  * Share longitudinal trends with her endocrinologist without printing reams of PDF lab reports.
* **Pain Points with Existing Systems:**
  * Fragmented apps: one for glucose meter, one for hospital visits, one for generic wellness.
  * Consultation portals feel cold, transactional, and lack follow-up memory.
* **MANVIA Experience Journey:**
  * Uses AI Voice Check-in every morning: "My fasting was 138, feeling a bit sluggish."
  * MANVIA logs metrics, detects a 4-day rising trend, and gently suggests booking a consultation with Dr. Rajesh.
  * Consents to share 30-day glycemic logs and recent lab report ahead of the tele-consult.

### Persona 2: Marcus Vance — The Stressed High-Performer
* **Demographics:** 29, Software Engineer, remote worker.
* **Health Context:** High workplace stress, episodic insomnia, irregular sleep rhythms, early burnout symptoms.
* **Goals:**
  * Rapid evening mental health debrief with an empathetic AI companion.
  * Pattern recognition linking work calendar intensity to sleep quality and mood.
  * Confidential, immediate access to general wellness coaching without clinical stigma.
* **Pain Points:**
  * Reluctant to schedule a traditional therapy session due to cost and scheduling hurdles.
  * Privacy paranoia: fears wellness journals could leak to employers or third-party ad networks.
* **MANVIA Safety Bounds:**
  * If Marcus expresses depressive despair or passive suicidal ideation, the AI safety engine immediately shifts from open conversation to Tier 1 crisis intervention protocols and crisis hotline warm handoffs.

### Persona 3: Sarah Jenkins — The Eldercare Proxy / Caregiver
* **Demographics:** 51, Managing care for her 78-year-old mother.
* **Health Context:** Mother has mild cognitive impairment and polypharmacy (7 daily medications).
* **Goals:**
  * Delegated proxy access to review doctor notes, prescription updates, and upcoming appointments.
  * Centralized repository of cardiology reports, discharge summaries, and medication schedules.
* **MANVIA Key Features Needed:**
  * Granular Consent & Proxy Authorization (Phase 10).
  * Explicit audit logging of every caregiver read/write action.

---

## 3. Clinician Archetypes

### Persona 4: Dr. Rajesh Nair, MD — General Physician & Telehealth Practitioner
* **Demographics:** 46, Board-Certified Internal Medicine, 18 years clinical practice.
* **Clinical Setting:** Runs private OPD and provides 8 hours/week on MANVIA.
* **Goals:**
  * Review concise, high-signal pre-consultation digests before entering the call.
  * Never deal with appointment double-booking or billing disputes.
  * Finish structured SOAP notes and digital prescription signing in under 3 minutes post-consult.
* **Frustrations with Modern EMRs:**
  * Bloated software requiring 15 clicks to review one lab result.
  * Unfiltered AI "hallucinations" entering clinical documentation.
* **MANVIA Design Requirements:**
  * Separation of AI wellness insights from formal medical chart notes.
  * Mandatory verification badge (Phase 8) before profile public listing.
  * Explicit consent token validation before patient medical record access is granted.

### Persona 5: Dr. Elena Rostova — Specialist Consultant (Dermatology / Endocrinology)
* **Demographics:** 38, Specialist with high-demand tertiary care consults.
* **Workflow:** Requires custom pre-consultation questionnaires (e.g., standardized photo uploads for skin lesions or continuous glucose meter charts) before approving appointment requests.
* **MANVIA Need:**
  * Asynchronous pre-consult review and consultation offer pricing models (Phase 9 & 13).

---

## 4. Platform Administration & Clinical Safety Personas

### Persona 6: Platform Trust & Clinical Safety Officer
* **Role:** Medical Director / Compliance Lead at MANVIA.
* **Responsibilities:**
  * Audit doctor credential submissions (medical licenses, government ID, malpractice insurance).
  * Review safety violation triggers (e.g., AI safety guardrail breaches, crisis escalations).
  * Maintain system prompt clinical guidelines and prohibited drug recommendations.
* **Tooling:** Admin portal with immutable audit log visibility, doctor credential verification queue, and incident review dashboard.
