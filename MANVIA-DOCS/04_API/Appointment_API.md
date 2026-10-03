# MANVIA — Appointment & Consultation Engine API Specification

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Overview & Authoritative State Lifecycle

The appointment engine coordinates doctor availability, slot reservation, payment confirmation, tele-consultation access, and cancellation/waitlist automation.

### 1.1 Distinction Between Slot Availability and Appointment Status
* **Doctor Slot Availability (`doctor_availability_slots`):**  
  * `AVAILABLE`: Slot open for reservation.
  * `HELD_IN_RESERVATION`: Locked by a patient for up to 10 minutes while completing intake/payment.
  * `BOOKED`: Confirmed appointment scheduled.
* **Appointment Entity Lifecycle (`appointments`):**
```
[Slot AVAILABLE] ---> POST /reserve (10-min Redis Lock) ---> [RESERVED]
                                                                  |
                         +----------------------------------------+-------------------+
                         | (Doctor Auto-Accept)                                       | (Requires Doctor Review)
                         v                                                            v
                    [CONFIRMED] <--- (Doctor Accepts) <--- [REQUESTED] ---> (Doctor Declines) ---> [DECLINED]
                         |                                                            |
                         | (Hold TTL Expires)                                         | (Hold TTL Expires)
                         v                                                            v
                     [EXPIRED]                                                    [EXPIRED]
                         |
                         v (Consultation Begins)
                    [IN_PROGRESS]
                         |
                         +---> (Consultation Ends + SOAP Note Signed) ---> [COMPLETED]
                         |
                         +---> (Cancellation Initiated) --------------> [CANCELLED]
                         |
                         +---> (Patient/Doctor Absent) ---------------> [NO_SHOW]
```

### 1.2 Authoritative Concurrency & Consistency Boundary
* **PostgreSQL ACID Boundary:** Double-booking prevention is authoritatively enforced at the database layer via PostgreSQL composite exclusion constraints (`EXCLUDE USING gist (doctor_id WITH =, tsrange(scheduled_start_time, scheduled_end_time) WITH &&)`).
* **Redis Distributed Lock (`Redlock`):** Acquired with a 10-minute TTL during `POST /reserve` to rapidly reject concurrent slot contenders (HTTP 409) and shed database contention.

### 1.3 Payment Abstraction & Mock Provider (Phase 13 vs Phase 19)
To ensure Phase 13 can be fully developed and integration-tested without a live payment gateway, the engine depends on a generic `PaymentService` abstraction. In Phase 13 through 18, a **Mock/Deferred Payment Provider & Event Simulator** automatically fulfills authorization webhooks. Real payment gateway integrations (Stripe Connect / Razorpay) are bound in Phase 19 with zero modification to the appointment state machine.

---

## 2. Endpoint Specifications

### 2.1 Reserve an Appointment Slot
* **HTTP Method:** `POST /api/v1/appointments/reserve`
* **Access:** Patient (`@Roles('PATIENT')`)
* **Headers:** `Idempotency-Key: <unique-uuid>`
* **Request Body:**
```json
{
  "doctorId": "DOC-90218471",
  "scheduledStartTime": "2026-10-02T10:00:00Z",
  "consultationType": "VIDEO_CALL"
}
```
* **Success Response `201 Created`:**
```json
{
  "status": "success",
  "data": {
    "reservationId": "res_84920184_uuid",
    "publicAppointmentId": "APT-18294719",
    "status": "RESERVED",
    "expiresAt": "2026-09-28T22:45:00Z",
    "feeAmount": 45.00,
    "currency": "USD",
    "clientPaymentSecret": "pi_3MtwBwLkdIwHu7ix28a3tqPa_secret_kjk9"
  }
}
```
* **Error Response `409 Conflict`:**
```json
{
  "status": "fail",
  "code": "SLOT_ALREADY_RESERVED",
  "message": "The selected consultation slot is no longer available.",
  "alternativeSlots": [
    "2026-10-02T11:00:00Z",
    "2026-10-02T14:30:00Z"
  ]
}
```

---

### 2.2 Get Appointment Details
* **HTTP Method:** `GET /api/v1/appointments/{appointmentId}`
* **Access:** Patient (owner), Doctor (assignee), or Admin
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": {
    "publicAppointmentId": "APT-18294719",
    "status": "CONFIRMED",
    "patient": {
      "publicPatientId": "PAT-48291048",
      "name": "Priya Sharma"
    },
    "doctor": {
      "publicDoctorId": "DOC-90218471",
      "name": "Dr. Rajesh Nair, MD",
      "specialty": "Internal Medicine"
    },
    "scheduledStartTime": "2026-10-02T10:00:00Z",
    "scheduledEndTime": "2026-10-02T10:30:00Z",
    "videoRoomId": "room_manvia_apt_18294719",
    "videoToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

---

### 2.3 Cancel Appointment
* **HTTP Method:** `POST /api/v1/appointments/{appointmentId}/cancel`
* **Access:** Patient or Doctor
* **Request Body:**
```json
{
  "cancellationReason": "Sudden emergency work travel",
  "requestRefund": true
}
```
* **Response `200 OK`:**
```json
{
  "status": "success",
  "data": {
    "publicAppointmentId": "APT-18294719",
    "status": "CANCELLED",
    "refundStatus": "INITIATED",
    "refundAmount": 45.00,
    "cancellationFee": 0.00
  }
}
```
* Emits domain event `appointment.cancelled`. Triggers waitlist worker to notify next candidate.

---

### 2.4 Join Waitlist for Fully Booked Slot
* **HTTP Method:** `POST /api/v1/appointments/waitlist`
* **Access:** Patient
* **Request Body:**
```json
{
  "doctorId": "DOC-90218471",
  "targetDate": "2026-10-02",
  "preferredTimeWindow": "MORNING"
}
```
* **Response `201 Created`:**
```json
{
  "status": "success",
  "data": {
    "waitlistTicketId": "wt_99481029",
    "queuePosition": 2,
    "expiresAt": "2026-10-02T23:59:59Z"
  }
}
```
