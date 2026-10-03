# MANVIA — Multilingual AI & Cross-Lingual Healthcare Strategy

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Overview & Cultural Competence

Healthcare and wellness conversations are deeply personal and emotional. Users frequently express distress, symptoms, and sensations in their native mother tongue or in code-switched dialects (e.g. Hinglish, Spanglish, Arabic-English mixtures).
MANVIA's multilingual AI strategy guarantees:
1. **Accurate intent extraction across colloquial vernaculars.**
2. **Culturally nuanced empathy and non-stigmatizing framing.**
3. **Safety classifier parity:** Crisis detection must be as fast and accurate in non-English languages as in English.

---

## 2. Target Language Tiers

| Tier | Languages | Capabilities |
|---|---|---|
| **Tier 1 (Launch Priority)** | English (US/UK/Global), Spanish (Latin America/Spain), Hindi | Full text, low-latency realtime voice, viseme avatar sync, localized crisis hotlines. |
| **Tier 2 (Post-Launch Expansion)** | Arabic, Portuguese (Brazil), Bengali, French, German | Full text companion, standard voice synthesis, emergency dispatch. |
| **Tier 3 (Subsequent Roadmap)** | Japanese, Mandarin, Regional Indic (Tamil, Telugu, Marathi) | Text companion, localized medical glossary. |

---

## 3. Code-Switching & Dialect Handling

Patients often blend languages within a single utterance:
> *"Doctor saab, I've had severe sir dard (headache) since yesterday and vomiting sensation ho rahi hai."*

### Architecture Approach:
1. **End-to-End Multilingual Foundation Models:**
   * Avoid two-step translation cascades (`STT -> Machine Translate to EN -> LLM in EN -> Translate back to Local -> TTS`).
   * Multi-hop cascades introduce 800ms+ latency and strip emotional subtext.
   * MANVIA directly uses multilingual foundation models (Gemini 1.5 Pro / Flash, GPT-4o) capable of native comprehension of code-switched speech.
2. **Audio / Speech-to-Text Pipeline:**
   * Uses Whisper large-v3 or Google Cloud Speech-to-Text v2 with dynamic language identification.

---

## 4. Cross-Lingual Safety & Crisis Hotlines

The AI Safety Pipeline maintains localized crisis intervention protocols. When a self-harm or violent crisis trigger fires, the emergency resources presented must match the user's detected jurisdiction and language:

| Region / Language | Primary Hotline | Dial Code | SMS / Text |
|---|---|---|---|
| United States (EN / ES) | Suicide & Crisis Lifeline | `988` | Text `988` |
| India (EN / HI) | Tele-MANAS / Vandrevala Foundation | `14416` / `9999 666 555` | — |
| United Kingdom (EN) | Samaritans / NHS 111 | `116 123` / `111` | Text `SHOUT` to `85258` |
| Canada (EN / FR) | Suicide Crisis Helpline | `988` | Text `988` |

---

## 5. Voice Synthesis & Pronunciation Tuning

* Natural healthcare cadence requires 10-15% slower pace than standard commercial TTS to facilitate cognitive ease and calm anxiety.
* Medical terminology pronunciation lexicons (SSML phoneme overrides) prevent robotic mispronunciations of drug names and anatomical terms.
