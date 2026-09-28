# MANVIA — Patient Domain API Specification

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Overview & Authentication Baseline

All patient endpoints reside under `/api/v1/patients` and require a valid Bearer JWT. Requests are validated through the `JwtAuthGuard` and role-restricted via `@Roles('PATIENT', 'ADMIN')`. Patients can only read or modify their own resource unless authorized via explicit proxy consent.

---

## 2. Endpoint Specifications

### 2.1 Get Current Patient Profile
* **HTTP Method:** `GET /api/v1/patients/me`
* **Description:** Retrieves the authenticated patient's clinical profile, emergency contacts, and active status.
* **Headers:** `Authorization: Bearer <token>`
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": {
    "id": "a3b89012-c456-4789-8901-234567890123",
    "publicPatientId": "PAT-48291048",
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
    "createdAt": "2026-01-10T08:30:00Z"
  }
}
```

---

### 2.2 Update Patient Profile
* **HTTP Method:** `PATCH /api/v1/patients/me`
* **Description:** Updates demographic or non-immutable patient details. Date of birth and legal name changes require administrative review once clinical records are attached.
* **Request Body:**
```json
{
  "bloodGroup": "B+",
  "emergencyContact": {
    "name": "Anil Sharma",
    "phone": "+14155552671",
    "relationship": "SPOUSE"
  }
}
```
* **Response `200 OK`**

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
