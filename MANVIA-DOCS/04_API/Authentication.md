# MANVIA — Authentication Strategy

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Authentication Overview

### ADR-009: JWT + Refresh Token Rotation

**Problem:** Healthcare platforms require both usability and strong security. Purely stateless JWTs cannot be revoked on logout or breach detection. Fully stateful sessions require sticky routing or central session store.

**Decision:** Hybrid approach:
- Short-lived access tokens (JWT, 15 minutes)
- Long-lived refresh tokens (opaque, database-backed, rotated on every use)
- Redis-backed fast revocation lookup for access tokens
- Token family tracking for breach detection

**Why not stateless JWT only:**
- Cannot revoke on logout — unacceptable for healthcare.
- Cannot detect token theft.
- No way to force logout across all devices.

**Why not session-only:**
- Sessions require shared state store for horizontal scaling (Redis solves this, but adds complexity).
- JWT is more standard for mobile API authentication.

**Hybrid advantage:** Access tokens are stateless (fast validation on every request). Refresh tokens are stateful (revocable, rotatable, auditable).

---

## 2. Token Design

### 2.1 Access Token (JWT)

```json
Header:
{
  "alg": "RS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "user_uuid",
  "jti": "token_uuid",
  "activeRole": "PATIENT",
  "availableRoles": ["PATIENT", "DOCTOR"],
  "sessionId": "session_uuid",
  "iat": 1727540000,
  "exp": 1727540900
}
```

**Signing algorithm:** RS256 (asymmetric). Private key signs; public key verifies. Public key can be shared with future service consumers without exposing the private key.

**Not included in JWT:** user email, name, health data, doctor verification status. Minimize PII in tokens.

**Active Role Concept:** Even if a user possesses both Patient and Doctor profiles, every individual API request executes under a single `activeRole` context. This enforces the security principle of least privilege.

**Expiry:** 15 minutes. Short enough to limit breach window; long enough for normal app usage with background refresh.

### 2.2 Refresh Token

- Opaque random string (256-bit entropy minimum)
- Never transmitted in URL
- HTTP-only cookie for web clients (prevents XSS theft)
- Secure bearer for mobile clients
- Stored as SHA-256 hash only — never plaintext in database
- Associated with a session and device
- TTL: 7–30 days (configurable; shorter for higher-sensitivity environments)

### 2.3 Token Family and Breach Detection

Each refresh token belongs to a "family" (family_id).

When a refresh token is used:
1. Verify token is valid and not expired or revoked.
2. Issue a new access token.
3. Issue a new refresh token (rotation).
4. Invalidate the old refresh token (used_at timestamp).

If a refresh token that was already used (used_at is set) is presented again:
- This indicates the old token was stolen.
- Immediately revoke the **entire token family** (all sessions in the family).
- Log a security event.
- Alert the user.

### 2.4 Dual-Role Identity and Role Context Switching
A single physical human user may hold both a `PatientProfile` and an approved `DoctorProfile`.
* **Security Rationale for Context Isolation:** A physician must never browse their personal wellness logs or book personal doctor consultations with active physician authorization flags in their request context. Context separation prevents accidental privilege escalation, audit ambiguity, and cross-domain data leakage.
* **Role Switching Endpoint:** `POST /api/v1/auth/switch-role`
  * **Payload:** `{ "targetRole": "DOCTOR" }`
  * **Authorization Guard:** The server verifies that the authenticated user (`sub`) owns an active profile corresponding to `targetRole`. If the user has not been verified as a doctor, switching to `DOCTOR` returns `403 Forbidden`.
  * **Token Reissuance:** Issues a new short-lived access JWT containing `activeRole: "DOCTOR"`, bound to the existing authenticated session.
  * **Audit Event:** Emits an immutable `AUTH.ROLE_SWITCH` audit log entry with IP and timestamp.

---

## 3. Session and Device Management

### 3.1 Sessions

Each login creates a new session record:
- session_id
- user_id
- device_id
- ip_address
- user_agent
- created_at
- expires_at

Users can view all active sessions and revoke specific sessions from their account settings.

### 3.2 Devices

Each device (browser, iOS app, Android app) is registered with:
- device_id (UUID, client-generated or server-assigned)
- device_type (WEB, IOS, ANDROID)
- device_name (user-readable, e.g., "iPhone 16")
- push_token (for push notifications — encrypted)
- last_seen_at

---

## 4. Password Policy

- Minimum 12 characters
- At least one uppercase, one lowercase, one number, one special character
- Password stored as bcrypt or Argon2id hash (DECISION REQUIRED: Argon2id is preferred for new systems)
- Never store plaintext passwords
- Password reset via time-limited email token (valid 15 minutes, single-use)
- Previous passwords check: DECISION REQUIRED (prevent reuse of last N passwords)

---

## 5. Email Verification

- All accounts require verified email before full access.
- Verification link sent on registration.
- Link contains a signed JWT with user_id and purpose claim (`purpose: "email-verification"`).
- Link expires in 24 hours.
- Resend available with rate limiting (max 3 per hour).

---

## 6. Rate Limiting on Auth Endpoints

| Endpoint | Limit | Window |
|---|---|---|
| POST /auth/login | 10 attempts | Per IP per 15 minutes |
| POST /auth/register | 5 attempts | Per IP per hour |
| POST /auth/refresh | 60 attempts | Per user per hour |
| POST /auth/forgot-password | 3 attempts | Per email per hour |
| POST /auth/reset-password | 5 attempts | Per token per 15 minutes |
| POST /auth/resend-verification | 3 attempts | Per email per hour |

After 10 consecutive failed login attempts from the same IP: temporary block with CAPTCHA — DECISION REQUIRED on CAPTCHA provider.

---

## 7. Future Authentication Extensions (Deferred)

The following are DEFERRED to Phase 5+ or post-MVP:

- Google OAuth 2.0
- Apple Sign-In (required if Google OAuth is available on iOS)
- OTP / passwordless login (SMS or email)
- Multi-factor authentication (TOTP)
- Passkeys / WebAuthn

**Note:** The authentication module must be designed to support these extensions without breaking changes to the session model.

---

## 8. Doctor vs. Patient Authentication

Authentication is unified. There is no separate login endpoint for doctors vs. patients. The JWT payload carries the user's roles, which determine what UI and API they can access.

A user who is both a patient and a doctor (future) uses one identity.

---

## 9. Admin Authentication

Admin accounts use the same authentication system. Admin role is assigned by a super-admin or through the database directly during initial setup.

Admin access requires additional security:
- Admin accounts must use MFA (DEFERRED for MVP; DECISION REQUIRED for timeline)
- Admin actions are audit-logged in full detail
- Admin sessions have shorter refresh token TTL (DECISION REQUIRED)

---

## 10. Logout Scenarios

| Scenario | Action |
|---|---|
| Normal logout | Revoke current session's refresh token |
| Logout all devices | Revoke all refresh tokens for user |
| Password reset | Revoke all refresh tokens for user (security) |
| Account suspension | Revoke all refresh tokens; blacklist current access tokens in Redis until expiry |
| Suspicious activity detected | Revoke token family; alert user |

---

*Implementation begins in Phase 4. No auth code is written before Phase 4.*
