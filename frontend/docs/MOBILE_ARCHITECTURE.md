# MANVIA Mobile Architecture Preparation

## 1. Executive Overview

MANVIA targets a unified omnichannel healthcare experience across:
- **Web**: Progressive Web Application (React, Vite, TypeScript)
- **Mobile (iOS & Android)**: React Native + Expo Application Services (EAS) + TypeScript

Both client platforms consume the same authoritative Fastify + NestJS backend REST and WebSocket APIs.

---

## 2. Core Architectural Principles

1. **Single Source of Truth**: The MANVIA backend owns business logic, medical record access rules, booking state machines, and payment calculations.
2. **Zero Rule Duplication**: Neither the Web client nor the Mobile client implements proprietary business rules. Both respect identical backend contracts and state transitions.
3. **Consistent User Experience**: Patients and doctors transitioning between mobile app and web browser experience predictable UX states, terminology, and workflows.

---

## 3. Shared Architectural Concepts

To maintain cross-platform integrity, the following concepts are standardized between Web and Mobile:

### A. API Contracts & Types
- Direct consumption of OpenAPI / Swagger schemas generated from the backend.
- Uniform request/response shapes and error payload parsing (`ApiErrorResponse`).
- Consistent correlation headers (`x-request-id`, `x-correlation-id`).

### B. Domain Terminology
- Uniform vocabulary across screens:
  - *Consultations* (not "calls" or "sessions")
  - *Daily Check-in* (not "survey" or "form")
  - *Clinical Summary / SOAP Notes*
  - *Prescriptions (Rx)*

### C. Validation Concepts
- Input validation patterns (email, phone, Indian medical registration number format, date formats) share compatible schemas.

### D. Authorization Semantics
- Unified role-based access:
  - `patient`
  - `doctor`
  - `admin`
- Consistent session token lifecycle:
  - Web: HTTP-only Secure Cookies / Secure Local Storage fallback.
  - Mobile: Expo SecureStore (encrypted keychain / keystore).

### E. State Machine Semantics
- Lifecycle states for appointments:
  - `SCHEDULED` → `WAITING` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`
- Payout statuses:
  - `PENDING` → `PROCESSING` → `PAID` / `FAILED`

### F. Design Tokens
- Color tokens (MANVIA Medical Teal, Emerald, Slate Neutrals, Semantic Danger/Warning/Success).
- Spacing scales (4, 8, 12, 16, 24, 32, 48, 64).
- Typography scale and font families (Plus Jakarta Sans).

---

## 4. Mobile Technical Stack (Planned)

- **Framework**: React Native 0.76+ with Expo SDK 52+
- **Navigation**: Expo Router (file-based navigation mirroring web route hierarchy)
- **Server State**: `@tanstack/react-query` v5
- **Local State**: `zustand`
- **Native Capabilities**:
  - Push notifications: Expo Notifications
  - Biometric auth: `expo-local-authentication` (FaceID / TouchID / Biometric Prompt)
  - Secure storage: `expo-secure-store`
  - Media & Camera: `expo-camera` / `expo-image-picker` for prescription and lab record uploads
