# MANVIA — Notifications & Device Messaging API Specification

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Overview & Privacy Principles

The Notification module coordinates in-app alerts, mobile push notifications (FCM / APNs), transactional email, and SMS.
**Health Privacy Constraint:**
* Under no circumstances may push notification or SMS payloads contain Protected Health Information (PHI), diagnostic terms, lab results, or prescription names.
* Payloads must remain generic: *"You have a new message from MANVIA"* or *"Your upcoming consultation has been confirmed. Open the app to view details."*

---

## 2. Endpoint Specifications

### 2.1 Register Device Push Token
* **HTTP Method:** `POST /api/v1/notifications/devices`
* **Access:** Authenticated User (Patient, Doctor, Admin)
* **Request Body:**
```json
{
  "deviceToken": "fcm_token_abcdef1234567890",
  "platform": "ANDROID",
  "deviceModel": "Pixel 8 Pro",
  "appVersion": "1.0.4"
}
```
* **Response `201 Created`:**
```json
{
  "status": "success",
  "data": {
    "deviceRegistrationId": "dreg_84920184_uuid",
    "registeredAt": "2026-09-28T22:30:00Z"
  }
}
```

---

### 2.2 Unregister Device Push Token (Logout / App Uninstall)
* **HTTP Method:** `DELETE /api/v1/notifications/devices/{deviceToken}`
* **Access:** Authenticated User
* **Response `200 OK`**

---

### 2.3 Get In-App Notification Inbox
* **HTTP Method:** `GET /api/v1/notifications/inbox`
* **Access:** Authenticated User
* **Query Parameters:** `unreadOnly=true`, `limit=20`, `cursor`
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "notif_992184_uuid",
      "category": "APPOINTMENT_REMINDER",
      "title": "Upcoming Consultation",
      "body": "Your video consultation with Dr. Rajesh Nair starts in 15 minutes.",
      "actionDeepLink": "manvia://appointments/APT-18294719",
      "isRead": false,
      "createdAt": "2026-10-02T09:45:00Z"
    }
  ],
  "meta": {
    "unreadCount": 3
  }
}
```

---

### 2.4 Mark Notification as Read
* **HTTP Method:** `PATCH /api/v1/notifications/{notificationId}/read`
* **Access:** Authenticated User
* **Response `200 OK`**

---

### 2.5 Get & Update Notification Preferences
* **HTTP Method:** `GET /api/v1/notifications/preferences`
* **HTTP Method:** `PUT /api/v1/notifications/preferences`
* **Request Body:**
```json
{
  "channels": {
    "push": true,
    "email": true,
    "sms": false
  },
  "categories": {
    "appointmentReminders": true,
    "dailyWellnessPrompts": true,
    "healthRecordAlerts": true,
    "marketingUpdates": false
  }
}
```
* **Response `200 OK`**
