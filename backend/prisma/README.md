# MANVIA Database & Prisma Boundary

## Ownership & Phase Assignment

- **Phase 1 (This Phase):** Established repository structure, Docker backing services (`docker-compose.dev.yml`), and configuration anchors.
- **Phase 3 (PostgreSQL + Prisma):** Owns full relational schema authoring, models (`User`, `PatientProfile`, `DoctorProfile`, `AdminProfile`), migrations, seeds, connection pooling, and raw PostgreSQL extensions (`pgvector`, `EXCLUDE USING gist`).

Do NOT add business domain tables or models during Phase 1.
