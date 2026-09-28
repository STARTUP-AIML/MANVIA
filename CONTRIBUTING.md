# Contributing to MANVIA

Thank you for contributing to MANVIA ("Care made simpler."). MANVIA is a mission-critical, enterprise healthcare and wellness platform designed with privacy, safety, and reliability at its core.

---

## 1. Architectural Principles

1. **Modular Monolith**: MANVIA is architected as a modular monolith in NestJS. Do not introduce microservices or unnecessary distributed architecture without team review.
2. **Phase Discipline**: Work proceeds strictly by sequential phase. Each phase has a designated owner responsible for implementation, tests, migrations, and documentation.
3. **No Unassigned Features**: Do not implement future phases or unassigned business logic early.
4. **Synthetic Data Only**: Never commit or test with real patient, doctor, or clinical data.

---

## 2. Git Workflow & Branching Strategy

The repository uses strict branch protection:

```
feature/phase-X-<description>
           │
           ▼ (PR + CI + Code Review)
        backend
           │
           ▼ (PR + Full Integration Suite)
       developer
           │
           ▼ (PR + Security Audit & E2E)
         main
```

- **Feature Branches**: Named `feature/phase-X-<short-description>`.
- **Target Branch**: All feature PRs must target `backend`. Direct pushes to `backend`, `developer`, and `main` are blocked.
- **Review Requirement**: At least one peer review is required before merging into `backend`.

---

## 3. Commit Message Conventions

MANVIA strictly follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

### Allowed Types
- `feat`: A new feature or major capability
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### Examples
- `feat(config): add typed environment schema with zod validation`
- `test(health): add liveness and readiness unit tests`
- `fix(docker): ensure non-root user permissions in runner stage`

---

## 4. Local Development Lifecycle

### Prerequisites
- Node.js 24 LTS
- npm 11+
- Docker & Docker Compose

### Commands
```bash
# Install dependencies
npm install

# Start local backing infrastructure (PostgreSQL 18 + Redis 7)
docker compose -f docker-compose.dev.yml up -d

# Run in development mode
npm run dev

# Check types and linting
npm run typecheck
npm run lint

# Format code
npm run format
npm run format:check

# Run test suites
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:cov

# Build production artifacts
npm run build
```

---

## 5. Security & Sensitive Data

- Never commit secrets, tokens, passwords, or encryption keys.
- Store local configuration in `.env` or `.env.local` (both are git-ignored).
- Document new environment variables in `backend/.env.example` with sanitized placeholders.
