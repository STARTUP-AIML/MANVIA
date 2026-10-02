# MANVIA Frontend Architecture Specification

## 1. Architectural Philosophy

MANVIA's frontend is engineered with an emphasis on clinical safety, presentation clarity, and robust boundaries between client UX and backend authority:

- **Presentation & Interaction Ownership**: The frontend owns UI rendering, client-side caching, interaction flow, and local input validation.
- **Backend Authority**: The backend is the single source of truth for authorization, health-record access, financial calculations, appointment booking correctness, and medical state transitions.
- **Strict Separation of Concerns**: Server state is handled exclusively via TanStack Query; client-side presentation state is handled via Zustand.

---

## 2. Centralized API Client Architecture

All network communication flows through the centralized `ApiClient` (`@/api/client/apiClient`):

```
React Component / TanStack Query
              │
              ▼
   Centralized ApiClient
              │
   ┌──────────┴──────────┐
   ▼                     ▼
Correlation ID       Bearer Auth Hook
(x-request-id)       (Token Provider)
   │                     │
   └──────────┬──────────┘
              ▼
   Fetch Request Pipeline (Timeout Controller: 15s)
              │
              ▼
    MANVIA Backend Gateway
```

### Error Normalization Alignment
Errors from the backend are caught by NestJS `GlobalExceptionFilter` and transformed into `ApiErrorResponse`:
```typescript
interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  requestId: string;
  timestamp: string;
}
```
The frontend's `ApiError` class normalizes HTTP responses into this exact structure, exposing semantic helpers:
- `.isNetworkError` (statusCode === 0)
- `.isTimeout` (statusCode === 408)
- `.isUnauthorized` (statusCode === 401)
- `.isForbidden` (statusCode === 403)
- `.isValidationError` (statusCode === 400)
- `.isServerError` (statusCode >= 500)

---

## 3. State Management Strategy

| Category | Technology | Usage Boundaries |
| :--- | :--- | :--- |
| **Server State** | TanStack Query v5 | Remote API queries, caching (`staleTime: 5m`, `gcTime: 10m`), mutations, optimistic updates, request deduplication. |
| **Client UI State** | Zustand | Sidebar collapsed/expanded, mobile drawer visibility, theme preferences, modal view toggles. Never duplicate backend entity state here. |
| **URL State** | React Router v6 | Active portal, filters, pagination, navigation history. |
| **Form State** | Controlled Inputs | Local form inputs with accessible labels and inline validation. |

---

## 4. Routing & Security Boundaries

### Route Structure
- `/`: Public landing overview and portal launcher.
- `/login`, `/register`: Authentication placeholders prepared for Phase 1 session workflows.
- `/app/*`: Patient Portal protected workspace (`PatientShell`).
- `/doctor/*`: Doctor Clinical protected workspace (`DoctorShell`).
- `/admin/*`: Administrator Governance protected workspace (`AdminShell`).
- `/dev-health`: Real-time system diagnostics and backend health ping.

### Security Invariant
> **Frontend route guards are UX; Backend authorization is security.**
The `ProtectedRoute` component manages client-side navigation flow, role checks, and redirects to enhance user experience. However, actual data protection and business rule enforcement are strictly executed on the server.

---

## 5. Design Token System

The styling architecture is built with Vanilla CSS Custom Properties defined in `src/styles/`:
- `tokens.css`: Color scales (brand teal, slate neutrals, semantic feedback), typography scales, spacing scale (4px to 64px), border radii, elevation shadows, motion durations.
- `reset.css`: Modern HTML5 baseline with accessible box-sizing and font smoothing.
- `typography.css`: Semantic heading hierarchy and body text scales.
- `components.css`: Styling rules for Button, Input, Card, Badge, Spinner, Skeleton, Modal, Toast, and Feedback states.

---

## 6. Internationalization (i18n)

The application utilizes an extensible i18n architecture centered on `I18nProvider` and `useTranslation`:
- Default development language: English (`en`).
- Fallback strategy: If a localized string is missing in Telugu (`te`) or Hindi (`hi`), the provider automatically falls back to the English equivalent.
- Parameter interpolation: Dynamic strings support `{param}` substitution.

---

## 7. Timezone Strategy

Healthcare platforms deal with critical scheduled events (consultation slots, prescription dosages, vitals logging).
- The frontend receives ISO 8601 UTC strings from the backend.
- The frontend detects user timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Dates and times are formatted using localized `Intl.DateTimeFormat` via `src/lib/date.ts` and `src/lib/timezone.ts`.

---

## 8. Testing Strategy

1. **Unit & Integration Tests**: Vitest + React Testing Library + JSDOM.
   - Comprehensive test coverage for application mounting, route transitions, API client request/error lifecycle, QueryClient defaults, Error Boundary containment, UI primitive states, accessibility landmarks, and secret prevention.
2. **E2E Testing Foundation**: Playwright configuration (`playwright.config.ts`) configured across Desktop Chrome, Mobile Chrome, and Mobile Safari.
