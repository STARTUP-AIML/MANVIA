# MANVIA — Platform Administration & Governance API Specification

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Overview & Administrative Security Gate

All administrative endpoints reside under `/api/v1/admin` and require an authenticated session equipped with the `ADMIN` role (`@Roles('ADMIN')`).
* Every administrative request is cryptographically traced and recorded in `audit_logs`.
* Access to patient health records from admin endpoints is strictly prohibited unless authorized under an active, formal clinical safety incident investigation with mandatory justification.

---

## 2. Doctor Credential Verification Queue

### 2.1 List Pending Doctor Verifications
* **HTTP Method:** `GET /api/v1/admin/doctors/verifications`
* **Access:** Admin
* **Query Parameters:**
  * `status`: Filter by status (`SUBMITTED`, `UNDER_REVIEW`, `MORE_INFORMATION_REQUIRED`)
  * `specialty`: Filter by primary specialty
  * `limit` & `cursor`: Standard pagination
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": [
    {
      "doctorId": "DOC-90218471",
      "legalName": "Dr. Rajesh Nair",
      "medicalRegistrationNumber": "MCI-2008-84729",
      "licensingCouncil": "Medical Council of India",
      "primarySpecialty": "Internal Medicine",
      "verificationStatus": "SUBMITTED",
      "submittedAt": "2026-09-28T18:00:00Z",
      "documents": [
        {
          "documentId": "doc-uuid-001",
          "documentType": "MEDICAL_LICENSE",
          "downloadUrl": "https://storage.manvia.com/credentials/...presigned-url..."
        }
      ]
    }
  ]
}
```

---

### 2.2 Adjudicate Doctor Verification Status
* **HTTP Method:** `POST /api/v1/admin/doctors/{doctorId}/adjudicate`
* **Access:** Admin
* **Request Body:**
```json
{
  "action": "VERIFY",
  "rejectionReason": null,
  "moreInformationRequested": null,
  "adminNotes": "State council medical registration verified via council portal lookup."
}
```
* **Supported Actions:** `VERIFY` (sets state to `VERIFIED`), `REJECT` (sets state to `REJECTED`), `REQUEST_INFO` (sets state to `MORE_INFORMATION_REQUIRED`), `SUSPEND` (sets state to `SUSPENDED`).
* **Response `200 OK`:** Emits `doctor.verification_adjudicated` event.

---

## 3. User Governance & Security Controls

### 3.1 Lock / Unlock User Account
* **HTTP Method:** `POST /api/v1/admin/users/{userId}/status`
* **Access:** Admin
* **Request Body:**
```json
{
  "status": "SUSPENDED",
  "reason": "Suspicious login attempts detected from compromised IP range"
}
```
* **Response `200 OK`:** Drops all active Redis sessions immediately.

---

## 4. Audit Log & Incident Exploration

### 4.1 Search Immutable Audit Logs
* **HTTP Method:** `GET /api/v1/admin/audit-logs`
* **Access:** Admin
* **Query Parameters:**
  * `actorUserId`, `actionName`, `resourceType`, `startDate`, `endDate`, `limit`, `cursor`
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "aud_84920194_uuid",
      "actorUserId": "usr-admin-01",
      "ipAddress": "198.51.100.24",
      "actionName": "DOCTOR_VERIFICATION.APPROVE",
      "resourceType": "doctor_profiles",
      "resourceId": "DOC-90218471",
      "createdAt": "2026-09-28T22:30:00Z"
    }
  ]
}
```

---

## 5. System Emergency Controls

### 5.1 Trigger Emergency Platform Kill Switch
* **HTTP Method:** `POST /api/v1/admin/system/kill-switches`
* **Access:** Admin (requires two-party administrative MFA authorization)
* **Request Body:**
```json
{
  "subsystem": "REALTIME_VOICE_GATEWAY",
  "enabled": false,
  "justification": "Upstream voice provider experiencing elevated error rate"
}
```
* **Response `200 OK`**
