# MANVIA — Healthcare Security Incident Response Plan (IRP)

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Purpose & Regulatory Alignment

This plan outlines the procedures for identifying, triaging, containing, mitigating, and reporting security incidents within MANVIA. It is designed for compliance-readiness aligned with:
* **HIPAA Breach Notification Rule** (45 CFR §§ 164.400-414)
* **GDPR Article 33/34** (72-hour regulatory notification requirement)
* **SOC 2 Trust Services Criteria** (Incident detection and recovery)

---

## 2. Incident Severity Classification

| Severity Level | Definition | Examples | SLA to Contain |
|---|---|---|---|
| **SEV-1 (Critical)** | Confirmed unauthorized access to PHI/PII, active ransomware, total system compromise. | Database dump exposed, KMS key exfiltration, unauthorized admin access to health records. | < 1 Hour |
| **SEV-2 (High)** | Potential vulnerability exploitation with elevated privileges; production service degraded. | Doctor verification bypass exploited, distributed denial-of-service affecting emergency features. | < 4 Hours |
| **SEV-3 (Medium)** | Localized security anomaly or bug without confirmed data exfiltration. | Single user token collision, rate-limiting bypass on public directory, non-exploited SSRF vulnerability. | < 24 Hours |
| **SEV-4 (Low)** | Minor compliance deviation, credential stuffing blocked by WAF, phishing attempt reported. | Suspicious login pattern on locked account, expired SSL certificate on dev environment. | < 72 Hours |

---

## 3. Incident Response Workflow Phases

```
+-------------------------------------------------------------+
| 1. DETECTION & TRIAGE                                       |
| - Alerts from GuardDuty, Datadog, Sentry, or user reports   |
| - On-call engineer assigns Severity Level (SEV 1-4)         |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 2. CONTAINMENT & ISOLATION                                  |
| - Revoke compromised API keys & rotate database credentials |
| - Terminate suspicious sessions via Redis token revocation  |
| - Isolate affected containers / block malicious IP at WAF   |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 3. ERADICATION & FORENSICS                                  |
| - Preserve immutable audit logs & disk snapshots            |
| - Identify root vulnerability & patch code                  |
| - Verify zero residual attacker presence                    |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 4. RECOVERY & RESTORATION                                   |
| - Restore systems from verified uncorrupted backups         |
| - Conduct progressive canary deployment                     |
| - Re-enable normal operational traffic                      |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 5. REGULATORY NOTIFICATION & POST-MORTEM                   |
| - GDPR: Notify lead supervisory authority within 72 hours   |
| - HIPAA: Notify HHS & affected individuals within 60 days   |
| - Publish Blameless Post-Mortem & update Risk Register      |
+-------------------------------------------------------------+
```

---

## 4. Emergency Kill Switches

The engineering team maintains automated and manual kill switches in the admin control plane:
* `KILL_SWITCH_AI_VOICE`: Immediately cuts off WebSocket voice gateway, falling back to text triage.
* `KILL_SWITCH_DOCTOR_BOOKINGS`: Pauses appointment slot locking and payment capture during upstream failures.
* `REVOKE_ALL_SESSIONS_BY_USER(userId)`: Drops all refresh and access tokens in Redis across all devices.
* `LOCKDOWN_HEALTH_RECORDS`: Restricts all S3 presigned URL generation to administrative auditors only during forensic review.
