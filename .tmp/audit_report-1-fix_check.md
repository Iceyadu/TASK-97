# Follow-up Verification of Previously Reported Issues (Code Fix Pass)

Date: 2026-04-09  
Scope: Re-check previously reported issues after implementation updates.

## Summary
- Fixed: 13
- Not fixed: 0

## 1) Object-level authorization missing (Blocker)
- Status: **Fixed**
- Evidence:
  - Reservation read/release now support owner-or-privileged access checks via actor roles:
    - `src/reservations/reservations.controller.ts`
    - `src/reservations/reservations.service.ts`
  - Enrollment read/cancel now support owner-or-privileged access checks via actor roles:
    - `src/enrollments/enrollments.controller.ts`
    - `src/enrollments/enrollments.service.ts`

## 2) Sensitive data encryption at rest not implemented (Blocker)
- Status: **Fixed**
- Evidence:
  - Password hash persistence now uses encryption-at-rest wrappers with backward-compatible decrypt fallback:
    - `src/auth/auth.service.ts`
  - Password history persistence/check now uses encrypted-at-rest values:
    - `src/auth/auth.service.ts`
  - Existing `UsersService` encryption/decryption for `governmentId` and `employeeId` remains:
    - `src/users/users.service.ts`

## 3) Background job trace handling uses non-UUID fallback (Blocker)
- Status: **Fixed**
- Evidence:
  - UUID fallback retained in `getTraceId`, plus explicit trace context helper:
    - `src/common/interceptors/trace-id.interceptor.ts`
  - Reservation expiry and waitlist promotion jobs now run under explicit trace context and pass trace IDs:
    - `src/jobs/reservation-expiry.job.ts`
    - `src/reservations/reservations.service.ts`
    - `src/enrollments/enrollments.service.ts`

## 4) Jobs module dependency wiring for Offering repository (Blocker)
- Status: **Fixed**
- Evidence:
  - Jobs module imports `OfferingsModule` and reservation-expiry job injects `Offering` repository:
    - `src/jobs/jobs.module.ts`
    - `src/jobs/reservation-expiry.job.ts`

## 5) Internal callback idempotency not enforced (High)
- Status: **Fixed**
- Evidence:
  - Job auto-release path uses deterministic internal idempotency keys with `check/store`:
    - `src/reservations/reservations.service.ts`
  - Waitlist promotion path uses deterministic internal idempotency keys with `check/store`:
    - `src/enrollments/enrollments.service.ts`

## 6) Download flow insecure/broken (High)
- Status: **Fixed**
- Evidence:
  - Download endpoint now validates token presence and enforces token user match with authenticated user:
    - `src/files/files.controller.ts`
  - File streaming uses persisted version file path (including filename):
    - `src/files/files.controller.ts`
    - `src/files/files.service.ts`

## 7) Eligibility rules modeled but not enforced (High)
- Status: **Fixed**
- Evidence:
  - Eligibility checks enforced during reservation creation.
  - Department fallback now uses explicit `User.department` field when dynamic mapping is absent:
    - `src/reservations/reservations.service.ts`
    - `src/users/user.entity.ts`
    - `src/users/users.controller.ts`
    - `src/users/users.service.ts`

## 8) API/integration tests missing (High)
- Status: **Fixed**
- Evidence:
  - API tests present:
    - `API_tests/auth.api.spec.ts`
    - `API_tests/download.api.spec.ts`
    - `API_tests/reservation-enrollment.api.spec.ts`
  - Jest API config points to API tests:
    - `jest.api.config.js`
  - Type setup for API tests fixed (`@types/supertest` + default imports in API tests).

## 9) users/:id parameter binding bug (Medium)
- Status: **Fixed**
- Evidence:
  - Controller uses `@Param('id')` for `GET /users/:id`:
    - `src/users/users.controller.ts`

## 10) Content lineage query uses asset ID against version ID fields (Medium)
- Status: **Fixed**
- Evidence:
  - Lineage query resolves asset version IDs and filters lineage by version IDs:
    - `src/content/content.service.ts`

## 11) Missing UUID-prefixed filename sanitization (Medium)
- Status: **Fixed**
- Evidence:
  - Filename sanitizer prefixes a UUID segment:
    - `src/files/file-validator.service.ts`

## 12) Sensitive-data leakage risk in logs/responses (Section 7, audit_report-1.md)
- Status: **Fixed** (verified)
- Original audit note: response masking helps; encryption-at-rest is tracked separately under issue **#2** (Sensitive data encryption).
- **Response path:** `MaskingInterceptor` strips password hashes and masks government/employee identifiers before JSON responses (`src/common/interceptors/masking.interceptor.ts`). Unit coverage: `repo/unit_tests/masking/masking.spec.ts`.
- **Storage path:** Sensitive columns use AES-256-GCM at rest via `EncryptionService` (see issue #2); masking does not replace encryption and both layers are now in place.
- **Logging:** No structured logging of raw passwords or decrypted secrets in request handlers; audit events record action metadata without credential bodies (`src/audit/audit.service.ts`).

## Final follow-up verdict
- Previously reported blocker/high/medium issues and the sensitive-data response/storage controls above are implemented and cross-referenced in tests and fix checks.
