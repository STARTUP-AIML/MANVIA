# MANVIA — Secrets Management & Cryptographic Key Strategy

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Secrets Management Philosophy

In a healthcare ecosystem subject to HIPAA, GDPR, and strict privacy regulations:
1. **Zero Secrets in Code or Git:** No API keys, database credentials, JWT secrets, or encryption keys may ever be committed to Git.
2. **Short-Lived & Automatically Rotated:** Long-lived master credentials are prohibited in production.
3. **Envelope Encryption:** Patient PHI is protected with data encryption keys (DEK) wrapped by a hardware Key Management Service (KMS).
4. **Least-Privilege RBAC for Secrets:** Services only receive access to secrets strictly required for their operational domain.

---

## 2. Secrets Taxonomy & Storage Locations

| Secret Classification | Examples | Storage Engine (Prod) | Rotation Frequency | Access Policy |
|---|---|---|---|---|
| **Root Master Keys (KEK)** | AWS KMS / Cloud KMS Master Key | Cloud KMS HSM (FIPS 140-2 Level 3) | Annual automated rotation | IAM Service Role only; non-exportable |
| **Database Credentials** | PostgreSQL master password, replica users | AWS Secrets Manager / HashiCorp Vault | 30-day automated rotation | NestJS runtime instance role |
| **Token Signing Secrets** | JWT Private Keys (RS256 / Ed25519) | AWS Secrets Manager / Vault | 90-day rotation (with overlapping key ID support) | Auth Module only |
| **Third-Party API Keys** | Stripe secret, Twilio auth token, OpenAI/Gemini keys | AWS Secrets Manager / Doppler | On-demand or 90 days | Specific integration adapters |
| **Local Dev Secrets** | `.env.local` for Docker containers | Local developer workstation (gitignored) | Static mock values | Developer only |

---

## 3. Envelope Encryption Architecture (PHI & Health Records)

Directly encrypting high volumes of medical files with a centralized KMS key incurs latency bottlenecks and cloud API cost spikes. MANVIA implements **Envelope Encryption**:

```
+-------------------------------------------------------+
|  Cloud KMS / HSM                                      |
|  [Master Key - KEK]                                   |
+-------------------------------------------------------+
        |                               ^
        | 1. GenerateDataKey()          | 3. Decrypt(Encrypted DEK)
        v                               |
+--------------------+           +--------------------+
| Plaintext DEK      |           | Encrypted DEK      |
| (Kept in memory)   |           | (Stored with doc)  |
+--------------------+           +--------------------+
        |
        v 2. AES-256-GCM Encrypt File
+-------------------------------------------------------+
| Encrypted Medical Document (Stored in S3 Bucket)      |
+-------------------------------------------------------+
```

1. NestJS requests a new Data Encryption Key (DEK) from Cloud KMS.
2. KMS returns a plaintext DEK and a ciphertext DEK encrypted by the Key Encryption Key (KEK).
3. The medical record or sensitive field is encrypted in-memory using AES-256-GCM.
4. The encrypted DEK is saved alongside the record in PostgreSQL or S3 object metadata.
5. The plaintext DEK is immediately scrubbed from memory (`Buffer.fill(0)`).

---

## 4. Enforcement & Prevention Safeguards

* **Pre-Commit Git Hooks:** `gitleaks` and `trufflehog` pre-commit hooks run on every local workstation and reject commits containing high-entropy strings or known token patterns.
* **CI/CD Secret Scanner:** GitHub Actions executes automated secret scanning on every PR. If a secret is detected, the pipeline fails immediately and flags the security channel.
* **Leaked Secret Runbook:** If a secret is ever pushed to any branch:
  1. Revoke the secret immediately at the provider dashboard.
  2. Invalidate all active sessions dependent on that key.
  3. Rotate the secret across all staging and production deployments.
  4. Perform Git history rewrite (`git filter-repo`) or squash if unmerged.
