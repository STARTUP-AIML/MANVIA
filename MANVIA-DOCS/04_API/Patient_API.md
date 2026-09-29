# MANVIA — Patient Domain API Specification

> Version: 0.2.0-phase6
> Status: PHASE 6 IMPLEMENTED (Patient Domain Foundation)
> Last Updated: 2026-09-29

---

## 1. Overview & Authentication Baseline

All patient endpoints reside under `/api/v1/patients` and require a valid Bearer JWT. Requests are validated through `AuthGuard` and role-restricted via `@Roles(Role.PATIENT)` and `RolesGuard`. The authenticated user context resolves the patient resource directly, eliminating IDOR vulnerabilities. Non-whitelisted request properties are strictly rejected via NestJS `ValidationPipe` (mass assignment mitigation).

---

## 2. Endpoint Specifications (Phase 6 Implemented)

### 2.1 Initialize Patient Profile
* **HTTP Method:** `POST /api/v1/patients/me`
* **Description:** Initializes a new `PatientProfile` for the authenticated central user identity. Assigns a unique public patient identifier in the format `PAT-XXXXXXXX`.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
```json
{
  "legalFirstName": "Priya",
  "legalLastName": "Sharma",
  "dateOfBirth": "1984-06-15",
  "biologicalSex": "FEMALE",
  "bloodGroup": "B+",
  "emergencyContact": {
    "name": "Anil Sharma",
    "phone": "+14155552671",
    "relationship": "SPOUSE"
  },
  "preferredLanguage": "en",
  "timezone": "Asia/Kolkata"
}
```
* **Response `201 Created`:**
```json
{
  "id": "a3b89012-c456-4789-8901-234567890123",
  "publicPatientId": "PAT-48291048",
  "userId": "u1b89012-c456-4789-8901-234567890123",
  "legalFirstName": "Priya",
  "legalLastName": "Sharma",
  "dateOfBirth": "1984-06-15T00:00:00.000Z",
  "biologicalSex": "FEMALE",
  "bloodGroup": "B+",
  "emergencyContact": {
    "name": "Anil Sharma",
    "phone": "+14155552671",
    "relationship": "SPOUSE"
  },
  "preferredLanguage": "en",
  "timezone": "Asia/Kolkata",
  "createdAt": "2026-09-29T08:30:00.000Z",
  "updatedAt": "2026-09-29T08:30:00.000Z"
}
```
* **Status Codes:** `201 Created`, `400 Bad Request` (validation failed), `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (profile already exists).

---

### 2.2 Get Current Patient Profile
* **HTTP Method:** `GET /api/v1/patients/me`
* **Description:** Retrieves the authenticated patient's domain profile and demographic details.
* **Headers:** `Authorization: Bearer <token>`
* **Response `200 OK`:** Returns `PatientProfileResponseDto` (see schema above).
* **Status Codes:** `200 OK`, `401 Unauthorized`, `403 Forbidden` (non-patient role), `404 Not Found` (profile not yet initialized).

---

### 2.3 Update Patient Profile
* **HTTP Method:** `PATCH /api/v1/patients/me`
* **Description:** Updates permitted demographic fields. Client-side attempts to modify `id`, `userId`, `publicPatientId`, `createdAt`, `updatedAt`, or authorization roles are strictly rejected with `400 Bad Request`.
* **Request Body:**
```json
{
  "preferredLanguage": "hi",
  "emergencyContact": {
    "name": "Anil Sharma",
    "phone": "+14155552671",
    "relationship": "SPOUSE"
  }
}
```
* **Response `200 OK`:** Returns updated `PatientProfileResponseDto`.
* **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

---

## 3. Future Domain Endpoints (Phase 10+ / Consent & Clinical Records)

---

### 2.3 List Granted Consents
* **HTTP Method:** `GET /api/v1/patients/me/consents`
* **Description:** Lists all active and historical consent records granted by the patient (terms, data processing, doctor record access).
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "c1092834-1111-2222-3333-444455556666",
      "consentType": "PHI_PROCESSING",
      "version": "2026.1",
      "granted": true,
      "grantedAt": "2026-01-10T08:30:00Z"
    },
    {
      "id": "d2092834-2222-3333-4444-555566667777",
      "consentType": "DOCTOR_RECORD_ACCESS",
      "targetDoctorId": "DOC-90218471",
      "granted": true,
      "expiresAt": "2026-10-15T00:00:00Z"
    }
  ]
}
```

---

### 2.4 Revoke Doctor Consent
* **HTTP Method:** `POST /api/v1/patients/me/consents/{consentId}/revoke`
* **Description:** Immediately revokes doctor access to health records. Revocation emits a domain event and updates caching layers instantly.
* **Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Consent successfully revoked"
}
```

---

### 2.5 Request Account Data Export (GDPR / HIPAA Subject Access)
* **HTTP Method:** `POST /api/v1/patients/me/export`
* **Description:** Triggers an asynchronous worker to assemble all patient PHI (wellness entries, appointment transcripts, medical records) into an encrypted ZIP file.
* **Response `202 Accepted`:**
```json
{
  "status": "accepted",
  "data": {
    "exportRequestId": "exp-992184-abcd",
    "estimatedCompletionSeconds": 60,
    "notificationChannel": "EMAIL"
  }
}
```
