# MANVIA — Deployment Architecture & CI/CD Pipeline

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Overview & Zero-Downtime Philosophy

All MANVIA backend services are packaged as immutable, hardened, multi-stage Docker containers and deployed across redundant availability zones.
Production deployments use **Rolling Updates** or **Blue/Green deployments** with automated health checks to ensure zero dropped user requests or severed WebSocket connections during upgrades.

---

## 2. Docker Containerization Standard

### Multi-Stage Build Specification (`Dockerfile`)
```dockerfile
# Stage 1: Build & Prune
FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma/
RUN npx prisma generate
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 2: Production Hardened Distroless / Alpine
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/liveness || exit 1

CMD ["node", "dist/main.js"]
```

---

## 3. CI/CD Pipeline (GitHub Actions)

```mermaid
graph TD
    A[Push to feature/phase-X] --> B[PR Opened against backend]
    B --> C[Stage 1: Lint & TypeCheck (tsc --noEmit)]
    C --> D[Stage 2: Unit & Integration Tests (Vitest)]
    D --> E[Stage 3: Security & Secret Scan (Gitleaks + Snyk)]
    E --> F[Stage 4: Prisma Migration Shadow Test]
    F --> G[All Checks Passed -> Peer Review Gate]
    G --> H[Merge into backend / developer / main]
    H --> I[Build & Tag Docker Image -> AWS ECR / Artifact Registry]
    I --> J[Run Database Migration: prisma migrate deploy]
    J --> K[Trigger Rolling Deployment on ECS/K8s]
    K --> L[Automated Synthetic Health Probe Verification]
    L -->|Healthy| M[Deployment Complete]
    L -->|Failed| N[Automated Rollback to Previous Image Tag]
```

---

## 4. Kubernetes / Container Orchestration Specification

* **Replicas:** Minimum 3 pods across 3 availability zones in production.
* **Auto-Scaling (HPA):**
  * Target CPU utilization: 65%
  * Target Memory utilization: 75%
  * Min replicas: 3, Max replicas: 20
* **Health Probes:**
  * **Liveness Probe:** `GET /health/liveness` (checks process responsiveness; restarts pod if 3 consecutive failures).
  * **Readiness Probe:** `GET /health/readiness` (checks PostgreSQL and Redis connectivity; drops pod from load balancer pool if dependencies degrade).
* **Graceful Shutdown:**
  * Handles `SIGTERM` signal.
  * Stops accepting new HTTP connections immediately.
  * Waits up to 30 seconds for in-flight requests and WebSocket drain before terminating.
