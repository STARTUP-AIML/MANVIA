# MANVIA — Security Architecture

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Security Philosophy

MANVIA handles some of the most sensitive personal data that exists: health information, medical records, and mental wellness content. Security is not a phase that comes after feature development — it is a design constraint that shapes every architectural decision.

**Principles:**
- Secure by default: every API requires authentication unless explicitly marked public.
- Least privilege: users and services access only what they need.
- Defense in depth: multiple independent security controls.
- Auditability: every sensitive action is logged and reviewable.
- Fail safe: when authorization is uncertain, deny access.

---

## 2. Authentication Architecture

See full detail: [../04_API/Authentication.md](../04_API/Authentication.md)

Summary:
- Short-lived JWT access tokens (15 minutes)
- Long-lived refresh tokens with rotation (database-backed, revocable)
- Token family breach detection
- RS256 signing (asymmetric)
- HTTP-only cookies for web refresh tokens

---

## 3. Authorization Architecture

### ADR-010: Resource-Level RBAC + Consent Enforcement

**Problem:** Role-based access alone is insufficient in healthcare. A doctor's role does not grant access to every patient. Access must be specific to actual relationships and consent.

**Decision:** Three-layer authorization:

```
Layer 1: Authentication
"Who is this user?"
(JWT validation)
         |
         v
Layer 2: Role Authorization
"Does this role have access to this type of resource?"
(RolesGuard)
         |
         v
Layer 3: Resource Authorization
"Does this user have access to THIS specific resource?"
(ResourceOwnerGuard or CareRelationshipGuard)
         |
         v
Layer 4: Consent Authorization
"Has the patient explicitly consented to this access?"
(ConsentGuard — for cross-user access)
```

### 3.1 Role Definitions

| Role | Can access |
|---|---|
| PATIENT | Own data only (profile, records, appointments, wellness, conversations) |
| DOCTOR | Own data + patient data within active care relationships AND with appropriate consent |
| ADMIN | All data with full audit logging; cannot access patient data silently |
| SYSTEM | Internal service-to-service communication; no user data without explicit scope |

### 3.2 Access Control Rules by Resource

| Resource | Patient | Doctor | Admin |
|---|---|---|---|
| Patient profile | Own only | Via care relationship + consent | Full (audit logged) |
| Health records | Own only | Via care relationship + health records consent | Full (audit logged) |
| Wellness data | Own only | Via care relationship + wellness consent | Full (audit logged) |
| AI conversations | Own only | NEVER | Audit metadata only |
| Appointments | Own only | Own appointments as doctor | Full |
| Doctor profile | Read public fields only | Own + edit | Full |
| Consent records | Own only | Own granted consents | Full |
| Audit logs | Own activity | Own activity | Full |
| Payments | Own only | Own payouts | Full |

---

## 4. Network Security

### 4.1 TLS

- All traffic encrypted with TLS 1.2 minimum; TLS 1.3 preferred.
- HTTP → HTTPS redirect enforced.
- HSTS header with long max-age.
- Certificate: DECISION REQUIRED (provider's managed cert or Let's Encrypt).

### 4.2 API Rate Limiting

Global rate limits plus endpoint-specific limits:

| Category | Default Limit | Window |
|---|---|---|
| Unauthenticated endpoints | 30 requests | Per IP per minute |
| Authenticated API | 200 requests | Per user per minute |
| Auth endpoints | See Authentication.md | Per IP/user |
| File upload | 10 uploads | Per user per hour |
| AI conversation | 60 messages | Per user per hour |

Rate limit exceeded: 429 Too Many Requests with `Retry-After` header.

### 4.3 Security Headers

All responses include:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: [defined per environment]
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(self), geolocation=()
```

Note: `microphone=(self)` is required for the AI voice feature.

### 4.4 CORS

CORS policy:
- Allowed origins: explicitly defined per environment (not wildcard `*`).
- Credentials: allowed.
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS.
- Headers: Content-Type, Authorization, X-Request-ID, Idempotency-Key.

---

## 5. Input Validation and Sanitization

- All request bodies validated by `class-validator` + `class-transformer` at the controller level.
- Validation is a global pipe — all routes are validated unless explicitly excluded.
- No user input is passed raw to SQL queries (Prisma parameterizes all queries).
- File uploads: MIME type validation, file size limits, virus scanning — DECISION REQUIRED for AV scanner.
- Text inputs: no HTML allowed in plain text fields (sanitize before storage).

---

## 6. Secrets Management

**Rule:** No secrets in source control. Ever.

### 6.1 Development

- Secrets in `.env` files (gitignored).
- `.env.example` provides the complete list of required variables with descriptions and safe placeholder values.

### 6.2 Staging and Production

**DECISION REQUIRED (linked to OD-001 cloud provider):**

Options:
- AWS Secrets Manager
- GCP Secret Manager
- HashiCorp Vault
- Azure Key Vault

Requirements:
- Secrets are retrieved at startup, not embedded in containers.
- Secrets are rotated on schedule.
- Access to secrets is audit-logged.
- Developers do not have access to production secrets.

---

## 7. Data Protection and Encryption

### 7.1 Encryption at Rest

- Database: PostgreSQL full-disk encryption (managed by cloud provider) — minimum baseline.
- Application-level encryption for especially sensitive fields (PII, health data): DECISION REQUIRED on key management approach.
- Object storage: server-side encryption enabled.
- Redis: encryption at rest if provider supports it; sensitive data should not be stored in Redis in plaintext regardless.

### 7.2 Encryption in Transit

- TLS everywhere (see section 4.1).
- Internal service-to-service communication also encrypted.

### 7.3 Sensitive Field Handling

Fields classified as HIGH sensitivity (see Data_Protection.md):
- Stored encrypted at application level.
- Never logged in plaintext.
- Never included in error messages.
- Access logged in audit trail.

---

## 8. Security Event Logging

Security events are logged to the `security_events` table:

| Event | Trigger |
|---|---|
| FAILED_LOGIN | Login with wrong credentials |
| ACCOUNT_LOCKED | Too many failed attempts |
| PASSWORD_CHANGED | Any password change |
| TOKEN_FAMILY_REVOKED | Breach detection triggered |
| SUSPICIOUS_IP | Login from unexpected geography |
| PERMISSION_DENIED | Authorization denied on sensitive resource |
| ADMIN_ACTION | Any admin operation |
| BULK_DATA_ACCESS | Unusually large data retrieval |
| API_RATE_LIMIT_EXCEEDED | Rate limit hit |

Security events are reviewed by MANVIA operations team on a regular cadence. Alerts are configured for CRITICAL events (DECISION REQUIRED: alerting channel).

---

## 9. Audit Architecture

### 9.1 Audit Log Principles

- Append-only. No updates or deletes.
- Every audit record includes: actor, action, resource type, resource ID, outcome, timestamp, IP address, correlation ID.
- Audit logs are segregated from application data and have separate access controls.
- Retention: LEGAL / REGULATORY REVIEW REQUIRED. Likely 5–7 years minimum for healthcare.

### 9.2 What Is Audited

- All authentication events (login, logout, refresh, password change)
- All resource creation, update, and deletion
- All health record access (read, upload, download, share)
- All consent events (grant, review, revoke)
- All appointment state transitions
- All doctor verification state transitions
- All payment events
- All admin operations
- All AI safety events

---

## 10. Dependency Security

- `npm audit` runs in CI on every PR.
- Dependabot or Renovate configured for automated dependency updates.
- Critical vulnerabilities: block PR, require immediate patch.
- High vulnerabilities: reviewed and patched within 7 days.
- Dependencies pinned to exact versions in `package-lock.json`.

---

## 11. Compliance Readiness Architecture

**MANVIA does not claim HIPAA, GDPR, DPDP, or any other compliance certification.** These certifications require formal audits that have not been conducted.

MANVIA is designed to be **compliance-ready**, meaning the architecture supports the technical controls required by common healthcare data regulations:

| Control | MANVIA Implementation |
|---|---|
| Access control | RBAC + resource-level + consent |
| Audit logging | Comprehensive audit trail |
| Data encryption | At rest + in transit |
| Data minimization | Collect only necessary data |
| Consent | First-class consent model |
| Data subject rights | Data export and deletion (with legal review) |
| Breach notification | Security event logging + incident response plan |
| Breach of contract | Data processing agreements with vendors — LEGAL REVIEW REQUIRED |

**LEGAL / REGULATORY REVIEW REQUIRED** before:
- Production launch in any jurisdiction
- Any marketing claims about security or compliance
- Handling patient data in production

---

## 12. Penetration Testing and Security Review

**Phase 20 deliverable:** Security review before production launch.

Requirements:
- Internal security review of authentication and authorization implementation.
- External penetration test by qualified security firm — DECISION REQUIRED.
- OWASP Top 10 checklist review.
- API security review (authentication bypass, IDOR, injection, etc.).
- Dependency vulnerability scan.

---

## 13. Incident Response

See detail: [../08_OPERATIONS/Incident_Runbook.md](../08_OPERATIONS/Incident_Runbook.md)

High-level process:
1. Detect (monitoring alert or user report)
2. Assess severity
3. Contain (revoke access, disable feature, etc.)
4. Investigate (audit logs, security events)
5. Remediate (patch, configuration change)
6. Notify (affected users, regulators if required — LEGAL REVIEW REQUIRED)
7. Post-mortem and prevention

---

*Security architecture is not finalized in Phase 0. It evolves in Phase 5 (Authorization), Phase 6+, and Phase 20 (hardening). Every phase owner is responsible for implementing the security controls relevant to their phase.*
