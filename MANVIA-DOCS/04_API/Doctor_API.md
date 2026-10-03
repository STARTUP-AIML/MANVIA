# MANVIA — Doctor Platform API Specification

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Overview & Doctor Verification Guard

Endpoints under `/api/v1/doctors` support doctor onboarding, verification document intake, availability scheduling, consultation offer management, and patient directory search.
Any attempt by an unverified doctor to access scheduling or public listing endpoints returns `403 Forbidden` (`DOCTOR_NOT_VERIFIED`).

---

## 2. Endpoint Specifications

### 2.1 Public Doctor Directory Search
* **HTTP Method:** `GET /api/v1/doctors`
* **Access:** Public (No auth required)
* **Query Parameters:**
  * `specialty` (optional): Filter by specialty (e.g. `Cardiology`)
  * `language` (optional): Filter by spoken language (e.g. `Spanish`, `Hindi`)
  * `maxFee` (optional): Maximum fee limit
  * `cursor` & `limit`: Pagination parameters (default limit: 20)
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": [
    {
      "publicDoctorId": "DOC-90218471",
      "fullName": "Dr. Rajesh Nair, MD",
      "primarySpecialty": "Internal Medicine",
      "subSpecialties": ["Cardiology", "Preventive Care"],
      "yearsOfExperience": 18,
      "baseConsultationFee": 45.00,
      "currency": "USD",
      "rating": 4.92,
      "totalConsultations": 340,
      "languages": ["English", "Hindi", "Malayalam"],
      "nextAvailableSlot": "2026-10-02T10:00:00Z"
    }
  ],
  "meta": {
    "nextCursor": "eyJpZCI6ImRvYy05MDIxODQ3MSJ9"
  }
}
```

---

### 2.2 Get Doctor Profile & Verification Status
* **HTTP Method:** `GET /api/v1/doctors/me`
* **Access:** Doctor (`@Roles('DOCTOR')`)
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": {
    "publicDoctorId": "DOC-90218471",
    "verificationStatus": "VERIFIED",
    "medicalRegistrationNumber": "MCI-2008-84729",
    "licensingCouncil": "Medical Council of India",
    "primarySpecialty": "Internal Medicine",
    "verifiedAt": "2026-01-15T14:20:00Z"
  }
}
```

---

### 2.3 Upload Verification Credentials (Presigned S3 Flow)
* **HTTP Method:** `POST /api/v1/doctors/me/verification-documents/presigned-url`
* **Description:** Initiates a secure direct-to-S3 upload for medical licenses, identity proofs, and diplomas.
* **Request Body:**
```json
{
  "documentType": "MEDICAL_LICENSE",
  "fileName": "state_medical_license.pdf",
  "fileSizeBytes": 2451000,
  "fileMimeType": "application/pdf",
  "sha256Hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": {
    "documentId": "doc-uuid-1234",
    "uploadUrl": "https://storage.manvia.com/credentials/doc-uuid-1234.pdf?AWSAccessKeyId=...",
    "expiresInSeconds": 300
  }
}
```

---

### 2.4 Configure Doctor Availability
* **HTTP Method:** `PUT /api/v1/doctors/me/availability`
* **Description:** Defines weekly recurring consultation windows. Conflicting or overlapping slot intervals are rejected.
* **Request Body:**
```json
{
  "weeklySchedule": [
    {
      "dayOfWeek": "MON",
      "startTime": "09:00",
      "endTime": "13:00",
      "slotDurationMinutes": 30,
      "bufferMinutes": 10
    },
    {
      "dayOfWeek": "WED",
      "startTime": "14:00",
      "endTime": "18:00",
      "slotDurationMinutes": 30,
      "bufferMinutes": 10
    }
  ]
}
```
* **Response `200 OK`:** Returns structured generated slots.

---

### 2.5 Submit Consultation Note & Prescription
* **HTTP Method:** `POST /api/v1/doctors/consultations/{appointmentId}/summary`
* **Description:** Post-consultation clinical closure. Attaches digital prescription and clinical encounter summary.
* **Request Body:**
```json
{
  "encounterSummary": "Patient reviewed for 3-week glycemic variability...",
  "clinicalObservations": "BP 128/82. Fasting blood sugar target updated.",
  "prescriptions": [
    {
      "medicationName": "Metformin Extended Release",
      "dosage": "500mg",
      "frequency": "Once daily with evening meal",
      "durationDays": 90,
      "instructions": "Take with full glass of water. Report gastrointestinal upset."
    }
  ],
  "followUpRecommended": true,
  "followUpDays": 30
}
```
* **Response `201 Created`:** Emits `consultation.summary_signed` domain event.
