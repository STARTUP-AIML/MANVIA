# MANVIA — Production Deployment Runbook

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Scope & Pre-Flight Checklist

This runbook guides engineers through releasing new software versions to the MANVIA production environment.

### Pre-Deployment Checklist
- [ ] PR has been reviewed and approved by at least two senior engineers.
- [ ] All CI checks passed (Unit, Integration, Security scans, TypeCheck).
- [ ] Schema changes (if any) follow the **Expand/Contract Pattern** and hold locks under 2000ms.
- [ ] Sentry / Datadog dashboards open on second screen to monitor error anomalies.
- [ ] On-call engineer alerted in Slack `#ops-deployment`.

---

## 2. Step-by-Step Production Release Workflow

### Step 1: Execute Forward Database Migrations
Always run database migrations as a standalone pre-deployment job before routing traffic to new application code:
```bash
# Executed via CI/CD runner inside private VPC
npx prisma migrate deploy
```
*Verify output confirms all pending migrations applied cleanly with zero errors.*

### Step 2: Trigger Container Rolling Update
Deploy the new container image tag to ECS / Kubernetes:
```bash
# Example Kubernetes deployment trigger
kubectl set image deployment/manvia-api \
  api=123456789012.dkr.ecr.us-east-1.amazonaws.com/manvia-backend:v1.2.0 \
  --record
```

### Step 3: Monitor Canary & Rolling Progress
Observe rollout status:
```bash
kubectl rollout status deployment/manvia-api
```
Verify that existing pods drain cleanly and new pods pass `/health/readiness` before old pods are terminated.

### Step 4: Post-Deployment Smoke Verification
Execute synthetic smoke tests against production endpoints:
```bash
curl -f -s https://api.manvia.com/health/readiness | jq .
curl -f -s https://api.manvia.com/api/v1/doctors?limit=1 | jq .
```
Verify:
1. HTTP 5xx error rate remains < 0.05% in Datadog.
2. Sentry displays no new unhandled exceptions.
3. Redis memory and PostgreSQL connection metrics remain stable.

---

## 3. Rollback Procedures

If critical errors occur during deployment (error rate > 1%, health checks failing):

### Fast Application Rollback:
```bash
kubectl rollout undo deployment/manvia-api
```
This immediately rolls back pods to the previous stable container image tag within 45 seconds.

### Database Migration Rollback:
Because of the Expand/Contract rule, the previous application version is fully compatible with any newly expanded columns or tables. **Do not attempt rushed rollback migrations on live production databases.** Simply revert the application code first.
