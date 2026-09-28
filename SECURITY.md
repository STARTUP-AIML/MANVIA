# Security Policy

## 1. Security Overview

MANVIA treats user privacy, patient confidentiality, and system security as top-tier engineering imperatives. We design and implement defense-in-depth controls across authentication, authorization, data encryption, and audit logging.

---

## 2. Reporting a Vulnerability

If you discover a potential security vulnerability within MANVIA, please report it immediately:

- **Email:** `security@manvia.health` (synthetic placeholder for reporting)
- **Response SLA:** Critical vulnerabilities are acknowledged within 24 hours and triaged within 48 hours.

**Please do NOT open public GitHub issues for security vulnerabilities.**

When reporting, please include:
1. Detailed description of the potential vulnerability
2. Reproduction steps or proof of concept
3. Potential impact assessment
4. Any proposed remediations

---

## 3. Engineering Security Baseline

- **Zero Secrets in Source Control:** No real credentials, tokens, or encryption keys in Git. Pre-commit checks and CI scanners block offending commits.
- **Least Privilege:** Services and containers run under unprivileged service accounts/non-root users.
- **Data Protection:** All sensitive health and identity fields require encryption at rest and in transit (TLS 1.3).
- **Audit Trails:** All sensitive read and write operations generate immutable audit records.
