# MANVIA Frontend — Pixel-Match Prototype

This project recreates the supplied Aushvaira AI reference landing page as a MANVIA-branded React/Vite frontend.

## Source basis
- Supplied reference screenshot: `public/reference-full.jpg`
- Supplied 15-phase frontend roadmap: architecture, setup, public website, auth, role shell, patient, doctor, verification, availability, consent, wellness/records, booking/waitlist, AI safety, realtime/voice/notifications/payments/admin.
- This build intentionally keeps backend integration out of scope. Mock/local UI states can be expanded before the separate integration phase.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Current implementation
- Pixel-oriented MANVIA public landing page based on the supplied screenshot
- Responsive desktop/tablet/mobile layouts
- Header, hero, ecosystem, AI assistant preview, mode cards, services, trust banner and footer
- Login/Get Started scaffold routes
- Local visual crops from the supplied reference for visual fidelity
- **Phase 5 — Wellness & Health Timeline**:
  - Patient daily wellness check-ins (1–5 scale for mood, stress, energy, sleep quality, plus sleep duration and notes)
  - Wellness summary cards (streak days, total check-ins, today's check-in status)
  - Aggregated multi-period wellness trends (`WEEK` / `MONTH`) with non-diagnostic descriptive insights
  - Historical check-in records table with pagination, edit, and delete functionality
  - Health Timeline chronological event feed with category filters (`WELLNESS_CHECK_IN`, `HEALTH_RECORD_ADDED`, `CONSULTATION`, `APPOINTMENT`, `OTHER`) and server-driven pagination
  - Integrated with live NestJS backend APIs under `/api/v1/wellness` and `/api/v1/health-timeline`
  - Automated unit and integration test suite with 100% pass rate (20/20 tests)
- **Phase 6 — Doctor Discovery & Doctor Profiles**:
  - Patient Doctor Discovery directory (`/doctors`) with responsive physician profile cards
  - Realtime specialty filter powered by live taxonomy (`/api/v1/doctors/specialties`)
  - Realtime language filter powered by live taxonomy (`/api/v1/doctors/languages`)
  - Doctor search by physician name, specialty, bio, or public doctor ID
  - Comprehensive Doctor Profile page (`/doctors/:doctorId`) with biography, qualifications, specialties, and fees
  - Doctor verification state presentation (`VERIFIED`, `PENDING_REVIEW`, `DRAFT`, `REJECTED`)
  - Physician availability schedule preview (`/api/v1/doctors/:publicDoctorId/availability`) with local timezone display
  - Consultation service offerings preview (`/api/v1/doctors/:publicDoctorId/offers`)
  - Strict Phase 6 boundary enforcement (booking actions disabled with Phase 7 notices)
  - Automated unit and integration test suite with 100% pass rate (38/38 total tests across Phases 5 & 6)

- **Phase 7 — Availability, Consultation Offers & Booking**:
  - Direct integration with backend endpoints: `GET /api/v1/doctors/:publicDoctorId/offers`, `GET /api/v1/doctors/:publicDoctorId/availability`, `POST /api/v1/appointments`, and `POST /api/v1/appointments/reserve`
  - Consultation offer selection displaying active title, duration in minutes, consultation type, and fee in backend currency
  - Accessible date calendar with weekday availability filtering matching physician's recurring schedule window
  - Discrete time slot calculation adhering strictly to backend availability hours and duration
  - Booking review card with physician details, offer metadata, scheduled slot time, and optional patient notes (max 500 chars)
  - Full double-submission protection and loading states during mutation in-flight
  - Race condition & slot conflict handling (HTTP 409) with explicit prompt to select another slot and automatic availability invalidation
  - Authoritative booking success state rendering backend `publicAppointmentId` (e.g. `APT-XXXXXXXX`) and status (`REQUESTED` / `CONFIRMED`)
  - Strict doctor verification check: prevents booking requests with unverified/draft physician profiles per backend policy
  - Role-based UX protection: restricts booking interactions to authenticated patients
  - Automated unit and integration test suite with 100% pass rate (57/57 total tests across Phases 5, 6 & 7)

- **Phase 8 — Appointments & Pre-Consultation**:
  - Direct integration with backend endpoints:
    - `GET /api/v1/appointments`: Server-filtered appointment lists with `timeFilter` (`UPCOMING`, `PAST`, `ALL`), `status`, and pagination
    - `GET /api/v1/appointments/:appointmentId`: Detailed appointment view displaying physician details, scheduled UTC time, consultation offer, fee, intake status, and notes
    - `POST /api/v1/appointments/:appointmentId/cancel`: Cancellation flow with validated cancellation reason (min 3 characters) releasing reserved slots
    - `GET /api/v1/appointments/:appointmentId/pre-consultation`: Clinical pre-consultation intake retrieval
    - `POST /api/v1/appointments/:appointmentId/pre-consultation`: Pre-consultation draft saving with optimistic caching
    - `POST /api/v1/appointments/:appointmentId/pre-consultation/submit`: Finalized intake submission and record locking (preventing further edits)
  - Accessible Appointment Status Badges mapping authoritative backend lifecycle states:
    - `REQUESTED` → "Waiting for Doctor Confirmation"
    - `CONFIRMED` → "Confirmed"
    - `RESERVED` → "Reserved"
    - `IN_PROGRESS` → "In Progress"
    - `COMPLETED` → "Completed"
    - `CANCELLED` → "Cancelled"
    - `DECLINED` → "Doctor Declined"
    - `EXPIRED` → "Expired"
    - `NO_SHOW` → "No-Show"
  - Medical Safety & Clinical Intake Compliance:
    - Neutral clinical preparation disclaimer ("This intake is reviewed directly by your doctor and does not constitute a diagnosis or treatment recommendation")
    - Typed intake fields: `reasonForVisit` (required, max 1000), `symptoms` (optional, max 2000), `symptomOnset` (optional, max 100), `currentMedications` (optional, max 2000), `allergies` (optional, max 1000), `patientNotes` (optional, max 2000)
    - Locked view with disabled inputs once submitted or when appointment is in a terminal state
  - Timezone Consistency:
    - Dates and times are displayed unambiguously with explicit UTC identifiers matching Phase 7 availability and booking conventions
  - Empty, loading, error, and stale state conflict handling (HTTP 409 conflict notifications and automatic cache refresh)
  - Known Backend Gaps: Rescheduling endpoint is not supported by backend contracts. The supported flow is booking a new slot and cancelling the previous appointment.
  - Automated unit and integration test suite with 100% pass rate (88/88 total tests across Phases 5, 6, 7 & 8)

- **Phase 9 — Health Records, Media & Consent**:
  - Direct integration with backend endpoints:
    - `POST /api/v1/health-records/upload-intent`: Presigned storage URL authorization with metadata validation
    - `PUT [uploadUrl]`: Direct binary upload to secure health records storage vault
    - `POST /api/v1/health-records/:recordId/finalize`: Finalizing upload, transitioning status to `AVAILABLE`, and emitting a timeline event
    - `POST /api/v1/health-records`: Direct Base64 ingest fallback
    - `GET /api/v1/health-records`: Server-paginated records with category, status, and clinical date range filtering
    - `GET /api/v1/health-records/:recordId`: Single record detail with original file specifications, MIME type, size, and care association
    - `GET /api/v1/health-records/:recordId/download-url`: Time-limited (5-minute) signed URL generation
    - `PATCH /api/v1/health-records/:recordId`: Metadata updating (title, category, clinical date, notes)
    - `DELETE /api/v1/health-records/:recordId`: Soft-delete and healthcare record archiving preserving data integrity
    - `GET /api/v1/consents`: Active, revoked, and expired patient consent agreements
    - `POST /api/v1/consents`: Granular consent grant with doctor ID, scopes, purpose, and expiration
    - `GET /api/v1/consents/:id`: Full consent record and immutable audit history
    - `POST /api/v1/consents/:id/revoke`: Revocation with reason and immediate access termination
  - Healthcare Data Safety & Zero-Trust Privacy:
    - No sensitive records or file buffers logged to console or persisted in localStorage
    - Signed download URLs expire in 5 minutes and are never permanently stored
    - No public or social sharing links; physician access requires an explicit, active consent grant
  - Authoritative Backend Taxonomies & Enums:
    - Record categories: `LAB_REPORT`, `PRESCRIPTION`, `CLINICAL_SUMMARY`, `IMAGING`, `DISCHARGE_SUMMARY`, `OTHER`
    - Record statuses: `PENDING`, `AVAILABLE`, `ARCHIVED`, `DELETED`
    - Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `image/tiff`, `application/dicom`
    - Maximum file size: `25 MB` (26,214,400 bytes)
    - Consent scopes: `PATIENT_PROFILE`, `CONSULTATION_INFO`, `PRE_CONSULTATION`, `HEALTH_RECORDS`, `HEALTH_TIMELINE`, `WELLNESS`
    - Consent statuses: `ACTIVE`, `REVOKED`, `EXPIRED`
    - Consent audit actions: `GRANTED`, `REVOKED`, `EXPIRED`, `SCOPE_UPDATED`
  - Clean Patient UX & Responsive Layout:
    - Tabbed patient interface (`/health-records` with `My Records` & `Doctor Access & Consent` tabs)
    - Detailed single record view (`/health-records/:recordId`) with edit modal, archive confirmation, and physician access transparency
    - In-modal document preview (PDF and images) with secure download action
    - Accessible dialogs, loading skeletons, error alerts with retry handlers, and empty states
  - Query Cache & Timeline Integration:
    - Health record creation/deletion invalidates both `['health-records']` and `['timeline']` cache keys
  - Automated unit and integration test suite with 100% pass rate (107/107 total tests across Phases 5, 6, 7, 8 & 9)


