# MANVIA — Backup & Data Retention Runbook

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Objectives & RPO / RTO Standards

To safeguard healthcare data and maintain regulatory compliance-readiness (aligned with HIPAA § 164.308(a)(7)(ii)(A)):
* **Recovery Point Objective (RPO):** < 5 Minutes (maximum allowable data loss in catastrophic outage).
* **Recovery Time Objective (RTO):** < 30 Minutes (maximum allowable time to restore full platform availability).

---

## 2. Backup Schedules & Architectures

| Data Store | Backup Method | Frequency | Retention Period | Storage Location |
|---|---|---|---|---|
| **PostgreSQL Primary** | Continuous WAL Archiving + Automated Daily Snapshots | Continuous (every 5 min WAL) + Daily full snapshot at 02:00 UTC | 35 Days (Point-in-Time Recovery), Monthly archive kept for 7 years | Cross-Region Replicated S3 Vault |
| **Redis Cache & State** | RDB Snapshots | Every 6 hours + On shutdown | 7 Days | Encrypted S3 Bucket |
| **Object Storage (S3)** | S3 Cross-Region Replication (CRR) + Versioning | Real-time asynchronous replication | 7 Years (WORM Compliance Lock) | Secondary Cloud Region (e.g. us-west-2) |

---

## 3. Point-in-Time Recovery (PITR) Execution Procedure

When data corruption or accidental drop occurs, restore to a specific minute:

```bash
# 1. Initiate RDS / Cloud SQL restore to target timestamp
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier manvia-db-prod \
    --target-db-instance-identifier manvia-db-restored-pitr \
    --restore-time 2026-09-28T14:32:00.000Z \
    --db-subnet-group-name manvia-vpc-db-subnets \
    --vpc-security-group-ids sg-0123456789abcdef0

# 2. Wait for instance status to reach 'available'
aws rds wait db-instance-available --db-instance-identifier manvia-db-restored-pitr

# 3. Verify data integrity via read-only validation queries
psql -h <restored_host> -U postgres -d manvia_db -c "SELECT count(*) FROM users;"

# 4. Point application database connection string (DATABASE_URL) to restored host
```

---

## 4. Quarterly Backup Restoration Drill

Automated backups that are never tested are not reliable.
* **Cadence:** Once every 90 days.
* **Procedure:** Engineering team restores production snapshot to a staging sandbox environment and runs automated regression tests.
* **Success Criteria:** Data fully restored and all verification tests pass in < 25 minutes.
