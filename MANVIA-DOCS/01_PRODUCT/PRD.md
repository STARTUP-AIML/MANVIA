# MANVIA — Product Requirements Document (PRD)

> Version: 0.1.0-phase0
> Status: DRAFT
> Last Updated: 2026-09-28

---

## 1. Product Overview

**Product Name:** MANVIA
**Tagline:** "Care made simpler."

MANVIA is a cross-platform healthcare and wellness platform that combines AI-driven wellness support with access to real human doctor consultations, comprehensive health record management, and longitudinal care journey tracking.

MANVIA is designed to be a serious, production-grade healthcare platform — not a proof of concept or minimum viable demo.

---

## 2. Problem Statement

Healthcare access is fragmented, intimidating, and disconnected:

- Patients struggle to find qualified doctors quickly.
- Booking consultations involves friction, phone calls, and wait times.
- Health records are scattered across clinics and paper files.
- Mental wellness and preventive care are often neglected.
- AI health assistants frequently cross the line into unauthorized medical advice.
- Doctor–patient relationships lack continuity.

MANVIA addresses these problems by providing a unified, safe, and intelligent care platform.

---

## 3. Product Vision

MANVIA is the platform where patients:

- Access a safe AI wellness companion for daily support and health education.
- Connect with qualified, verified doctors for real medical consultations.
- Manage all their health records in one secure place.
- View their entire health journey on a longitudinal timeline.
- Consent explicitly to who can access their information.

And where doctors:

- Manage their availability and consultation offerings.
- Accept appointments on their terms.
- Access patient history only through appropriate relationships and consent.
- Build ongoing care relationships with patients.

---

## 4. Target Users

See: [User_Personas.md](User_Personas.md)

### Patient
- Age: 18–65+ (broad)
- Needs: Wellness support, access to doctors, health record storage
- Behavior: Owns a smartphone; comfortable with apps
- Primary pain: Can't easily find or book a doctor; wellness apps don't connect to real care

### Doctor
- Age: 28–65
- Needs: Streamlined appointment management, patient overview before consultation
- Behavior: Time-constrained; values efficiency; licensed professional
- Primary pain: Admin burden, no-shows, patient context before sessions

### Admin
- Role: MANVIA platform operator
- Needs: User management, doctor verification oversight, system monitoring
- Behavior: Internal staff

---

## 5. Core Feature Areas

### 5.1 AI Companion
- Conversational support (text and voice)
- Health education
- Wellness assistance
- Multilingual interaction
- Human escalation pathway
- AI always identified as AI — never as a human doctor

### 5.2 Wellness Tracking
- Mood, stress, sleep, energy tracking
- Check-in journals
- Trend visualization
- Wellness insights (non-diagnostic)

### 5.3 Doctor Discovery
- Search by specialty, language, availability
- View verified doctor profiles
- View consultation offers and pricing

### 5.4 Appointment System
- Availability-based booking
- Session time preferences (morning, afternoon, evening)
- Appointment state machine (see Appointment_API.md)
- Doctor accept/decline workflow
- Double-booking prevention

### 5.5 Consultations
- Pre-consultation intake
- Consultation record
- Consultation summary
- Follow-up

### 5.6 Health Records
- Lab reports
- Prescriptions
- Consultation summaries
- User-uploaded medical documents
- Secure storage with access control

### 5.7 Health Timeline
- Longitudinal view of all care events
- Wellness check-ins, appointments, consultations, uploads, consent events

### 5.8 Care Relationships
- Explicit patient–doctor relationship model
- Consent-based data access

### 5.9 Consent
- Grant, review, and revoke consent
- Scoped consent (not one global grant)
- Consent audit trail

### 5.10 Safety
- AI safety content detection
- Crisis escalation pathway
- Emergency resource display (geography-verified — LEGAL REVIEW REQUIRED)
- Safety event logging

### 5.11 Payments and Billing
- Consultation fee payment
- Refunds and cancellation policy
- Doctor payouts
- Invoices

### 5.12 Notifications
- In-app, push, email, SMS
- Appointment reminders
- Verification status updates
- Consultation summaries

### 5.13 Administration
- User management
- Doctor verification management
- System configuration
- Analytics and reporting

---

## 6. Platform Targets

| Platform | Priority | Notes |
|---|---|---|
| iOS (native/hybrid) | P0 | Mobile-first market |
| Android (native/hybrid) | P0 | Mobile-first market |
| Web (responsive) | P0 | PWA acceptable for v1 |
| Desktop (macOS, Windows) | P1 | Via responsive web |

---

## 7. Non-Functional Requirements

### 7.1 Performance
- API response time: P95 < 300ms for non-AI endpoints
- AI streaming response: first token < 2 seconds (target; measure and verify)
- Appointment hold: processed within 500ms
- Object storage upload: progress feedback within 1 second

### 7.2 Availability
- DECISION REQUIRED: target SLA (99.5% / 99.9% / 99.95%)
- Planned maintenance windows to be defined

### 7.3 Security
- All health data encrypted at rest and in transit
- Authentication required for all non-public endpoints
- Audit log for all sensitive operations
- No real patient data in non-production environments

### 7.4 Scalability
- Architecture must support horizontal scaling of API tier
- Database must support connection pooling and read replicas at scale
- Object storage is inherently scalable via provider

### 7.5 Privacy
- Data minimization: collect only what is necessary
- Consent-based access to health data
- Right to data export: DECISION REQUIRED on format and scope
- Right to deletion: LEGAL / REGULATORY REVIEW REQUIRED

### 7.6 Accessibility
- Web: WCAG 2.1 AA compliance target
- Mobile: native accessibility support (VoiceOver, TalkBack)

### 7.7 Internationalization
- AI must support multilingual interaction
- UI must support right-to-left languages if target market requires — DECISION REQUIRED
- Date/time: display in local timezone; store in UTC

---

## 8. Out of Scope (Phase 0)

The following are intentionally deferred:

- EHR/EMR integration with external hospital systems
- Insurance billing and claims
- Prescription e-prescribing to pharmacies
- Diagnostic laboratory order submission
- Wearable device integration
- Group consultations
- Hospital/clinic management
- Multi-tenancy / white-label operation

---

## 9. Regulatory and Legal Considerations

**LEGAL / REGULATORY REVIEW REQUIRED** for all of the following before production launch:

- Telemedicine regulations in target jurisdiction
- Health data storage and processing regulations
- Doctor credential verification standards
- Payment processing regulations for healthcare
- Emergency resource display requirements
- AI wellness/health application disclosures
- Data retention periods for health records
- Patient consent requirements under applicable law
- Terms of service and privacy policy

MANVIA does not claim any compliance certification (HIPAA, GDPR, DPDP, etc.) until formally audited and certified.

---

## 10. Success Metrics (Draft)

DECISION REQUIRED: Define specific KPIs and measurement strategy.

Candidate metrics:
- Patient registration and activation rate
- AI conversation satisfaction (feedback)
- Appointment booking conversion rate
- Appointment completion rate (vs. no-show / cancellation)
- Doctor acceptance rate
- Time from search to confirmed appointment
- Health record upload frequency
- Consent grant rate
- Safety escalation response time

---

*This PRD will be revised as product decisions are made and open decisions (OPEN_DECISIONS.md) are resolved.*
