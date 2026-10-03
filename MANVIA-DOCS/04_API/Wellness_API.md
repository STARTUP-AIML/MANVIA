# MANVIA — Wellness Engine & Health Timeline API Specification

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Overview & Data Ingestion

The Wellness Engine allows patients to log daily subjective and objective wellness metrics (mood, stress, sleep hours, energy, and journal reflections).
The Health Timeline provides a unified, chronologically unified feed combining wellness entries, doctor consultations, lab uploads, and medication events.

---

## 2. Endpoint Specifications

### 2.1 Submit Daily Wellness Check-in
* **HTTP Method:** `POST /api/v1/wellness/checkins`
* **Access:** Patient (`@Roles('PATIENT')`)
* **Request Body:**
```json
{
  "moodScore": 4,
  "stressScore": 2,
  "sleepHours": 7.5,
  "energyScore": 4,
  "journalReflection": "Felt much more focused today after morning walk. Fasting blood sugar was normal.",
  "loggedAt": "2026-09-28T22:30:00Z"
}
```
* **Response `201 Created`:**
```json
{
  "status": "success",
  "data": {
    "entryId": "w_84920194_uuid",
    "streakDays": 12,
    "aiReflection": "Great job maintaining consistent sleep and activity! Your 7-day average stress level has dropped by 18%."
  }
}
```

---

### 2.2 Get Longitudinal Wellness Trends
* **HTTP Method:** `GET /api/v1/wellness/analytics`
* **Access:** Patient (or Doctor with active consent)
* **Query Parameters:**
  * `startDate=2026-09-01`
  * `endDate=2026-09-28`
  * `metrics=mood,stress,sleep`
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": {
    "summary": {
      "averageMood": 3.8,
      "averageStress": 2.4,
      "averageSleep": 7.2,
      "totalCheckins": 26
    },
    "dataPoints": [
      { "date": "2026-09-01", "mood": 4, "stress": 3, "sleep": 6.8 },
      { "date": "2026-09-02", "mood": 3, "stress": 4, "sleep": 6.2 }
    ]
  }
}
```

---

### 2.3 Get Unified Health Timeline Feed
* **HTTP Method:** `GET /api/v1/wellness/timeline`
* **Access:** Patient (or authorized Doctor)
* **Query Parameters:**
  * `limit=20`
  * `cursor=eyJ0aW1lc3RhbXAiOiIyMDI2LTA5LTI4VDIyOjMwOjAwWiJ9`
  * `categories=WELLNESS,APPOINTMENT,LAB_REPORT,PRESCRIPTION`
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": [
    {
      "eventId": "evt_001",
      "eventType": "WELLNESS_LOG",
      "timestamp": "2026-09-28T22:30:00Z",
      "title": "Daily Wellness Check-in",
      "summary": "Mood: 4/5, Sleep: 7.5h, Stress: 2/5",
      "sourceEntityId": "w_84920194_uuid"
    },
    {
      "eventId": "evt_002",
      "eventType": "APPOINTMENT",
      "timestamp": "2026-09-20T14:00:00Z",
      "title": "Consultation with Dr. Rajesh Nair",
      "summary": "Routine Glycemic Review — Metformin renewed",
      "sourceEntityId": "APT-18294719"
    },
    {
      "eventId": "evt_003",
      "eventType": "LAB_REPORT",
      "timestamp": "2026-09-18T09:15:00Z",
      "title": "Fasting Lipid & HbA1c Panel",
      "summary": "HbA1c: 6.8% (Target: < 7.0%)",
      "sourceEntityId": "rec_99218471"
    }
  ],
  "meta": {
    "nextCursor": "eyJ0aW1lc3RhbXAiOiIyMDI2LTA5LTE4VDA5OjE1OjAwWiJ9"
  }
}
```
