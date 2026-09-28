# MANVIA — Infrastructure & Cloud Operations Handover

> Version: 0.1.0-phase0  
> Status: DRAFT — Phase 0 Specification  
> Last Updated: 2026-09-28  

---

## 1. Cloud Architecture Overview

The MANVIA infrastructure runs inside dedicated, multi-AZ Virtual Private Clouds (VPC) with complete isolation between Public, Application, and Data subnets.

```
Internet ---> [Cloudflare WAF / DDoS Protection]
                    |
                    v (TLS 1.3)
      [Public Subnet: Application Load Balancer]
                    |
                    v (Private VPC Peering)
      [Application Subnet: ECS / Kubernetes Pods]
                    |
                    v (Restricted Security Groups)
      [Data Subnet: PostgreSQL Multi-AZ + Redis Cluster]
```

---

## 2. Network & Subnet Topology

| Subnet Tier | CIDR Block | Access Control | Resources Hosted |
|---|---|---|---|
| **Public Subnets** | `10.0.1.0/24`, `10.0.2.0/24` | Internet Gateway | Application Load Balancers (ALB), NAT Gateways |
| **Private App Subnets** | `10.0.10.0/24`, `10.0.11.0/24` | Egress via NAT only; No public IP | NestJS API pods, background workers |
| **Private Data Subnets** | `10.0.20.0/24`, `10.0.21.0/24` | Ingress only from App Subnet Security Group | PostgreSQL Primary & Replicas, Redis Clusters |

---

## 3. IAM Least-Privilege Roles

1. **`manvia-app-role`:**
   * Used by NestJS application instances.
   * Permissions: `kms:GenerateDataKey`, `kms:Decrypt`, `s3:PutObject`, `s3:GetObject` on `manvia-*-prod` buckets only.
   * Prohibited: No IAM modification permissions, no direct database management rights.
2. **`manvia-ci-runner-role`:**
   * Used by GitHub Actions runners via OpenID Connect (OIDC).
   * Permissions: Push to ECR container registry, update ECS service tasks, trigger migration jobs.

---

## 4. Disaster Recovery DNS Routing

* **Primary Domain:** `api.manvia.com`
* **DNS Provider:** Cloudflare / Route 53
* **Routing Policy:** Failover routing with active health check on `https://api.manvia.com/health/liveness`.
* **Failover Target:** Secondary warm standby ALB located in failover region.
