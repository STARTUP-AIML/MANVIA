# MANVIA Notification Platform Architecture (Phase 18)

**Product:** MANVIA — _Care made simpler._  
**Domain:** Notification Platform (In-App, Push, Email, SMS, Preferences, Localization, Templates, Delivery Tracking, Retries, Idempotency)

---

## 1. Architectural Overview

MANVIA Phase 18 implements a production-grade, centralized, and decoupled notification engine. It eliminates any direct coupling between business domains (appointments, waitlist, refunds, doctor verification, security) and notification dispatching or external delivery providers.

```
Domain Module (e.g. Appointments, Waitlist, Refunds, Auth)
     ↓
Domain Event (IDomainEvent)
     ↓
NotificationOrchestratorService
     ↓
Notification Policy & Preference Evaluation (NotificationPreferencesService)
     ↓
Safe Parameterized Notification Template Engine (TemplateEngineService)
     ↓
Notification Delivery Tracking Record (NotificationDeliveryService)
     ↓
Channel Adapter Abstraction (IEmailProvider, IPushProvider, ISmsProvider)
     ↓
Provider Result & Bounded Exponential Retry Handling
```

---

## 2. Notification Taxonomy

The platform enforces a controlled enumeration (`NotificationType`):

- **Appointments:** `APPOINTMENT_REQUESTED`, `APPOINTMENT_CONFIRMED`, `APPOINTMENT_DECLINED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_REMINDER`
- **Waitlist:** `WAITLIST_OFFER`, `WAITLIST_EXPIRED`, `WAITLIST_FULFILLED`
- **Refunds:** `REFUND_REQUESTED`, `REFUND_PROCESSING`, `REFUND_COMPLETED`, `REFUND_FAILED`
- **Doctor Verification:** `DOCTOR_VERIFICATION_SUBMITTED`, `DOCTOR_VERIFICATION_APPROVED`, `DOCTOR_VERIFICATION_REJECTED`
- **Security:** `SECURITY_LOGIN`, `SECURITY_PASSWORD_CHANGED`, `SECURITY_SESSION_REVOKED`
- **Wellness:** `WELLNESS_REMINDER`
- **System:** `SYSTEM_NOTIFICATION`

---

## 3. Channels and Delivery Model

Supported channels:

- `IN_APP` (persisted inbox notifications)
- `PUSH` (Android, iOS, Web via registered device tokens)
- `EMAIL` (transactional email notifications)
- `SMS` (direct SMS messages through abstracted gateway)

### Delivery States

Each delivery attempt is tracked in `NotificationDelivery`:
`PENDING` -> `PROCESSING` -> `SENT` / `DELIVERED` or `FAILED` (with retry count up to `MAX_RETRIES = 3`).

---

## 4. User Notification Preferences & Mandatory Security Invariant

Users manage their channel preferences and category toggles through `/api/v1/notifications/preferences`.

- **Mandatory Invariant:** Security notifications (`SECURITY_LOGIN`, `SECURITY_PASSWORD_CHANGED`, `SECURITY_SESSION_REVOKED`) cannot be disabled. The policy evaluation guarantees delivery over in-app and email channels regardless of user preferences.

---

## 5. Safe Templates & Localization

- Parameter interpolation: `{param}` replacement without executable code or unsafe evaluation.
- Multilingual fallback chain: `requestedLocale` (e.g. `te`) -> base language (`en-US` -> `en`) -> default fallback (`en`).
- Timezone awareness: Timestamps and appointment schedules formatted strictly in the user's configured timezone (`userTimezone`).

---

## 6. Device Token Management

- Push tokens registered via `/api/v1/notifications/devices`.
- Sensitive credential protection: push tokens are redacted in all audit logs (`***REDACTED***`).
- Multi-platform support: `ANDROID`, `IOS`, `WEB`.
- Strict user isolation: users can only manage their own devices.

---

## 7. Deterministic Idempotency & Rate Protection

- Unique constraint and deterministic idempotency keys:
  `eventId + notificationType + userId`
- Duplicate events are skipped safely and return the existing notification record without duplicate dispatching.

---

## 8. REST API Endpoints

- `GET /api/v1/notifications` — List paginated notifications for authenticated user
- `GET /api/v1/notifications/:id` — Get notification details by UUID or public ID (`NOT-XXXXXXXX`)
- `PATCH /api/v1/notifications/:id/read` — Mark notification as read
- `POST /api/v1/notifications/read-all` — Mark all unread notifications as read
- `DELETE /api/v1/notifications/:id` — Delete in-app notification
- `GET /api/v1/notifications/preferences` — Get notification preferences
- `PATCH /api/v1/notifications/preferences` — Update notification preferences
- `GET /api/v1/notifications/devices` — List active registered devices
- `POST /api/v1/notifications/devices` — Register push device token
- `PATCH /api/v1/notifications/devices/:id` — Update device status
- `DELETE /api/v1/notifications/devices/:id` — Remove device registration
- `GET /api/v1/admin/notifications/deliveries` — Admin inspection of failed/pending deliveries
- `POST /api/v1/admin/notifications/deliveries/:id/retry` — Admin manual delivery retry
