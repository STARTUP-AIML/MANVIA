# MANVIA — Authorization Architecture

> Version: 0.1.0-phase0
> Status: DRAFT — Phase 0 Specification
> Last Updated: 2026-09-28

---

## 1. Authorization Design

See ADR-010 in Security_Architecture.md for the decision record.

MANVIA uses a layered authorization model:

```
1. JWT Authentication     → Who is this person?
2. Role Authorization     → What type of user are they?
3. Resource Authorization → Do they own or have a relationship to this resource?
4. Consent Authorization  → Has the patient explicitly consented to this access?
```

All four layers must pass for cross-user access to sensitive health data.

---

## 2. NestJS Guard Implementation

### 2.1 JwtAuthGuard
- Validates the access token signature and expiry.
- Attaches the decoded user context to the request.
- Returns 401 if invalid.

### 2.2 RolesGuard
- Reads `@Roles('DOCTOR', 'ADMIN')` decorator.
- Checks the user's roles from the JWT or database.
- Returns 403 if role does not match.

### 2.3 ResourceOwnerGuard
- Reads the resource ID from route params.
- Queries the database to confirm ownership.
- Returns 403 if the requesting user does not own the resource.

### 2.4 CareRelationshipGuard
- Checks that an ACTIVE CareRelationship exists between the requesting doctor and the patient who owns the resource.
- Returns 403 if no active relationship.

### 2.5 ConsentGuard
- Checks that the patient has granted active consent for the specific scope being accessed.
- Checks consent expiry.
- Returns 403 if no valid consent.

---

## 3. Authorization Decorator Pattern

Endpoints declare their authorization requirements via decorators:

```typescript
@Get(':patientId/health-records')
@Roles(UserRole.DOCTOR)
@RequireCareRelationship()
@RequireConsent(ConsentScope.HEALTH_RECORDS)
@UseGuards(JwtAuthGuard, RolesGuard, CareRelationshipGuard, ConsentGuard)
async getPatientHealthRecords(@Param('patientId') patientId: string) {
  // ...
}
```

---

## 4. What Doctors Can Access

A doctor is authorized to access patient information only when ALL of the following are true:

1. An ACTIVE CareRelationship exists between the doctor and the patient.
2. The patient has granted an ACTIVE, non-expired consent with the appropriate scope.
3. The consent has not been revoked.
4. The access falls within the purpose defined in the consent.

**No exceptions.** Even in emergency contexts, the authorization model must be enforced. Emergency access bypasses should be explicitly designed, logged, and reviewed — not silently allowed.

---

## 5. Admin Authorization Rules

Admins have broad access but:
- Every admin action is logged with the admin's identity, the action, the target resource, and the justification.
- Admins cannot silently access patient health data without audit.
- Admins cannot approve their own doctor verification.
- Super-admin access (if needed) is a separate role with additional controls.

---

## 6. Authorization Failure Handling

Authorization failures must:
- Return 403 Forbidden with a semantic error code.
- NOT reveal whether the resource exists (prevent information disclosure).
  - A doctor accessing a non-existent patient and a patient without a care relationship should receive the same 403 (or 404 if the resource doesn't exist — choose consistently).
- Be logged as security events.

---

## 7. Future Considerations

- Attribute-Based Access Control (ABAC): if authorization logic grows complex, consider migrating to an ABAC framework (e.g., Casbin) rather than growing the guard chain indefinitely.
- Policy service: if authorization rules need to be configurable without code changes, extract to a policy service.

**DECISION REQUIRED:** Evaluate ABAC vs. guard chain complexity at Phase 10 review.
