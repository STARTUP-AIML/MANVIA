# MANVIA — Vendor Evaluation & Third-Party Services Register

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Third-Party Governance in Healthcare

Because MANVIA processes Protected Health Information (PHI), all external software vendors with potential access to encrypted or unencrypted data must:
1. Sign a formal **Business Associate Agreement (BAA)** (for US HIPAA jurisdiction) or a Data Processing Addendum (DPA) under GDPR.
2. Maintain SOC 2 Type II or ISO 27001 certifications.
3. Support data residency guarantees and zero data retention for AI training.

---

## 2. Vendor Selection & Evaluation Matrix

| Category | Primary Candidate | Secondary / Fallback | BAA / DPA Required | Cost Structure |
|---|---|---|---|---|
| **Cloud Hosting** | AWS (us-east-1 / us-west-2) | Google Cloud Platform | **YES (Signed BAA)** | Pay-as-you-go infrastructure + reserved instances |
| **Primary AI Foundation Model** | Google Gemini (Vertex AI with BAA) | OpenAI (Enterprise Tier with BAA) | **YES (Zero Data Training)** | Token-based ($ / 1M tokens) |
| **Object Storage (S3)** | AWS S3 with Object Lock | Cloudflare R2 | **YES** | Storage ($/GB) + Egress |
| **Payment Gateway** | Stripe Connect | Razorpay (for India expansion) | No PHI passed (Payer ID only) | 2.9% + $0.30 per transaction |
| **SMS / OTP Verification** | Twilio | AWS SNS / MessageBird | No (Phone number only) | Pay per SMS sent ($0.0079) |
| **Transactional Email** | SendGrid / AWS SES | Postmark | No PHI in subject/body | Tiered monthly plan |
| **Error Monitoring** | Sentry (HIPAA Compliant plan) | Datadog APM | **YES (Scrub PHI)** | Seat + event quota |
| **Realtime WebRTC Video** | Daily.co / Twilio Video | LiveKit (Self-hosted) | **YES (Encrypted streams)** | Per participant minute ($0.004/min) |

---

## 3. Zero AI Training Data Retention Agreement

A strict contractual requirement for all AI model providers (Google Cloud Vertex AI, OpenAI Enterprise):
* User conversations, medical records, or transcripts sent through the inference API **must never be used to train, fine-tune, or improve provider models**.
* Inference data must be discarded immediately upon request completion.
