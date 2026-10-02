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

## Next implementation pass
The remaining phases (Phases 6–9: Doctor discovery, booking, pre-consultation, and records vault) will be added in subsequent phases.

