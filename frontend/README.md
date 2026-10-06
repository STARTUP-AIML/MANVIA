# MANVIA Frontend — Care that feels human.

Production-grade web client for the MANVIA Healthcare and Wellness platform. Built with React 18, TypeScript (strict mode), Vite, TanStack Query, React Router, and standard CSS design tokens.

---

## Prerequisites

- **Node.js**: `>= 20.0.0` (v22.x recommended)
- **npm**: `>= 10.0.0`
- **Backend Service**: Running at `http://localhost:3000` (Fastify + NestJS gateway)

---

## Getting Started

### 1. Installation

From the repository root or the `frontend/` directory:

```bash
cd frontend
npm install
```

### 2. Environment Configuration

Copy the example environment configuration to `.env.local` or `.env`:

```bash
cp .env.example .env
```

Default configuration in `.env.example`:

```env
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:3000/api/v1

# Backend Health Check Base URL
VITE_BACKEND_URL=http://localhost:3000

# Application Environment
VITE_APP_ENV=development

# Application Public Title
VITE_APP_NAME=MANVIA
```

> **SECURITY INVARIANT**:
> Only public client configuration prefixed with `VITE_` may reside in frontend environment files.
> Never place database credentials, JWT secret keys, Redis configs, or payment gateway private keys in frontend code.

---

## Standard Development Commands

All commands can be run directly inside `frontend/` or from the repository root:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server at `http://localhost:5173` |
| `npm run build` | Compiles TypeScript and builds production bundle to `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint against all TypeScript and React files |
| `npm run lint:fix` | Automatically fixes ESLint issues |
| `npm run typecheck` | Validates TypeScript types across the codebase (`tsc --noEmit`) |
| `npm test` | Runs all Vitest unit and integration test suites |
| `npm run test:watch` | Runs Vitest in watch mode for active TDD |
| `npm run test:coverage` | Generates code coverage report via Vitest (v8) |

---

## Service Endpoints & Diagnostic URLs

| Service / Capability | URL |
| :--- | :--- |
| **Frontend Web Client** | `http://localhost:5173` |
| **Developer Health Check** | `http://localhost:5173/dev-health` |
| **Backend Gateway** | `http://localhost:3000` |
| **Backend REST API** | `http://localhost:3000/api/v1` |
| **Backend Health Check** | `http://localhost:3000/health` |
| **Backend Swagger / OpenAPI** | `http://localhost:3000/docs` |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Application bootstrap, routing, and provider hierarchy
│   │   ├── providers/          # AppProviders (ErrorBoundary, QueryProvider, I18nProvider, ToastProvider)
│   │   ├── router/             # AppRoutes, ProtectedRoute guard interface
│   │   └── app.tsx             # Root App component
│   │
│   ├── api/                    # Centralized API layer (single source of truth for network I/O)
│   │   ├── client/             # ApiClient class, base URL, request/response pipeline
│   │   ├── errors/             # Normalized ApiError matching backend GlobalExceptionFilter
│   │   └── generated/          # OpenAPI/Swagger contract codegen destination
│   │
│   ├── auth/                   # Authentication contracts & session types (Phase 1 readiness)
│   │
│   ├── components/             # Reusable UI component library
│   │   ├── ui/                 # Design primitives: Button, Input, Card, Badge, Spinner, Skeleton, Modal
│   │   ├── feedback/           # UX states: Loading, Empty, Error, Retry, Unauthorized, Forbidden, NetworkError, Success, Toast
│   │   └── layout/             # Layout primitives: Container, Header, Sidebar, Footer
│   │
│   ├── features/               # Domain feature modules (Phase 1+ implementations)
│   │
│   ├── hooks/                  # Custom hooks: useApi, useDebounce, useMediaQuery
│   │
│   ├── layouts/                # Portal shells: PatientShell, DoctorShell, AdminShell
│   │
│   ├── lib/                    # Core utilities: env, date, timezone
│   │
│   ├── routes/                 # Top-level view routes: Landing, Login, Register, Patient, Doctor, Admin, DevHealth, NotFound
│   │
│   ├── state/                  # Client-only presentation state (Zustand uiStore)
│   │
│   ├── styles/                 # Design token CSS architecture (tokens, reset, typography, components)
│   │
│   ├── i18n/                   # Internationalization architecture (English default, multi-language readiness)
│   │
│   ├── types/                  # Authoritative TypeScript declarations (ApiErrorResponse, ApiResponse, common types)
│   │
│   ├── test/                   # Test utilities (renderWithProviders)
│   │
│   └── main.tsx                # Browser entrypoint
│
├── public/                     # Static assets: favicon.svg, robots.txt
├── tests/                      # Vitest test suites (rendering, routing, API client, error boundary, primitives, security)
├── docs/                       # Architectural documentation (ARCHITECTURE.md, MOBILE_ARCHITECTURE.md)
├── .env.example                # Public environment variable template
├── package.json                # Project dependencies and lifecycle scripts
├── tsconfig.json               # TypeScript strict configuration
├── vite.config.ts              # Vite bundler configuration with `@/` alias
├── vitest.config.ts            # Vitest unit testing configuration
├── eslint.config.js            # Flat ESLint configuration
└── playwright.config.ts        # Playwright E2E foundation
```

---

## Git & Branch Workflow

```
feature/frontend-phase-0-foundation   <-- Current Phase 0 branch
        ↓
       PR
        ↓
    frontend                           <-- Frontend long-lived branch
        ↓
Frontend phases complete
        ↓
       PR
        ↓
    developer                          <-- Staging integration branch
        ↓
Full backend + frontend integration testing
        ↓
      main                             <-- Production branch
```

---

## Phase 0 Scope & Verification

Phase 0 establishes the engineering foundation:
- Application bootstrap & provider hierarchy
- Routing architecture with foundation routes (`/`, `/login`, `/register`, `/app`, `/doctor`, `/admin`, `/dev-health`, `*`)
- Centralized `ApiClient` with correlation headers and error normalization matching Fastify/NestJS
- TanStack Query client with production defaults (staleTime: 5m, gcTime: 10m, retry policy)
- Zustand store for presentation UI state (no duplicate server state)
- MANVIA design-token CSS system (colors, typography, spacing, radii, elevation, motion)
- Reusable UI primitives (Button, Input, Card, Badge, Spinner, Skeleton, Modal, Toast)
- 8 Global UX state patterns (Loading, Empty, Error, Retry, Unauthorized, Forbidden, NetworkError, Success)
- Responsive layout shells (PatientShell, DoctorShell, AdminShell)
- Timezone & date utilities respecting user IANA timezone
- Internationalization architecture with parameter interpolation
- Global React Error Boundary with safe user-facing fallback
- Zero backend secrets invariant
- Comprehensive unit & component tests passing 100%
