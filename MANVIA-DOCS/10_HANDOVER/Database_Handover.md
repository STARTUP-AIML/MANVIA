# MANVIA — Database Administrator Handover & Operations Guide

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Database Architecture Summary

The production database is an enterprise PostgreSQL 18 cluster with:
* Primary Multi-AZ instance for writes and critical transactional reads.
* Read Replica cluster for analytics, search queries, and longitudinal timeline feeds.
* Connection Pooling managed via **PgBouncer** in transaction pooling mode.
* Extension `pgvector` enabled for AI embedding cosine similarity lookups.

---

## 2. Connection Pooling & Limits (PgBouncer)

To prevent PostgreSQL connection exhaustion under high concurrency:
* **Max Client Connections:** 2,000 (across all NestJS container replicas).
* **Pool Mode:** `transaction`
* **Default Pool Size per Server:** 50
* **Max DB Connections to Postgres Core:** 150

### Connection Strings:
* **Transactional Write Pool (App):** `postgresql://app_user:***@pgbouncer.prod:6432/manvia_prod?pgbouncer=true`
* **Direct Admin / Migration String (Prisma Migrate):** `postgresql://admin_user:***@db-primary.prod:5432/manvia_prod`

---

## 3. High-Value Diagnostic & Monitoring Queries

### Check Active Locks and Blocked Queries
```sql
SELECT
    blocked_locks.pid     AS blocked_pid,
    blocked_activity.usename  AS blocked_user,
    blocking_locks.pid    AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query    AS blocked_statement,
    blocking_activity.query   AS current_statement_in_blocking_process
FROM  pg_catalog.pg_locks         blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks         blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Check Table Bloat & Dead Tuples
```sql
SELECT
    relname AS table_name,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    round(n_dead_tup * 100.0 / nullif(n_live_tup + n_dead_tup, 0), 2) AS dead_percentage,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
```
