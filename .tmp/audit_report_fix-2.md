# Revalidation Report (2026-04-09)

Project: `/Users/mac/Documents/EaglePoint/TASK-97/TASK-meridian/repo`

## Executive Summary

- Fixed: 4
- Partially fixed: 2
- Not fixed: 2

## Per-Issue Findings

1) **UsersModule dependency wiring is likely broken**  
**Status: Fixed**

Evidence:
- `UsersModule` now wires admin dependencies by importing `RolesModule` and exposing `AdminController`:  
  - `src/users/users.module.ts:8`  
  - `src/users/users.module.ts:15`  
  - `src/users/users.module.ts:18`
- `AdminController` dependencies (`AuthService`, `LockoutService`, `Repository<UserRole>`) are all resolvable from module imports/providers:  
  - `src/users/admin.controller.ts:33-36`

Validation:
- Build succeeds: `npm run build` (pass).

---

2) **Idempotency isolation is flawed**  
**Status: Fixed**

Evidence:
- DB key scope includes all three fields (`key`, `endpoint`, `userId`) as composite primary key:  
  - `src/idempotency/idempotency-key.entity.ts:12`  
  - `src/idempotency/idempotency-key.entity.ts:15-16`  
  - `src/idempotency/idempotency-key.entity.ts:18-19`
- Runtime check/store also scopes by endpoint + user:  
  - `src/idempotency/idempotency.service.ts:24-27`  
  - `src/idempotency/idempotency.service.ts:40-44`  
  - `src/idempotency/idempotency.service.ts:65-68`  
  - `src/idempotency/idempotency.service.ts:76-77`

Validation:
- `unit_tests/idempotency/idempotency-isolation.spec.ts` passes.

---

3) **Manual approval enrollment flow is incomplete**  
**Status: Partially fixed**

What is fixed:
- Explicit approved-to-confirmed path exists (`POST /enrollments/:id/confirm-approved`) and service implementation is present:  
  - `src/enrollments/enrollments.controller.ts:84-94`  
  - `src/enrollments/enrollments.service.ts:306-383`
- Seat decrement on approved confirmation and seat return on cancel are implemented:  
  - `src/enrollments/enrollments.service.ts:338-345`  
  - `src/enrollments/enrollments.service.ts:209-218`
- Waitlist approval path exists:  
  - `src/enrollments/enrollments.service.ts:260-299`

Remaining inconsistency/risk:
- Reservation confirmation with `requiresApproval=true` creates enrollment directly in `APPROVED` state (not `WAITLISTED`) after seat was already held/decremented at reservation time:  
  - `src/reservations/reservations.service.ts:102-108`  
  - `src/enrollments/enrollments.service.ts:101-113`
- `confirmApprovedEnrollment` decrements seat for *any* `APPROVED` enrollment, which can double-decrement for this reservation-origin `APPROVED` path:  
  - `src/enrollments/enrollments.service.ts:328-339`

Conclusion:
- The new flow exists, but seat accounting is still not fully coherent across all `APPROVED` entry paths.

---

4) **Server-side file sniffing is incomplete**  
**Status: Fixed**

Evidence:
- Stronger MP4 checks (ftyp offset, box size, brand validation):  
  - `src/files/file-validator.service.ts:97-114`  
  - `src/files/file-validator.service.ts:207-228`
- TXT binary-content rejection (null bytes + non-printable ratio + structural pass):  
  - `src/files/file-validator.service.ts:116-121`  
  - `src/files/file-validator.service.ts:137-163`  
  - `src/files/file-validator.service.ts:230-238`

Validation:
- `unit_tests/files/file-sniffing.spec.ts` passes.

---

5) **Layered dataset requirement is only partially implemented**  
**Status: Fixed**

Evidence:
- Feature layer persistence exists and is now called in parsing job:  
  - `src/parsed-documents/parsing.service.ts:146-169`  
  - `src/jobs/content-parsing.job.ts:60`
- Duplicate-group workflow is invoked automatically post-parse:  
  - `src/jobs/content-parsing.job.ts:73-74`
- Duplicate group creation/linking logic exists in service:  
  - `src/duplicate-detection/duplicate-detection.service.ts:32-60`  
  - `src/duplicate-detection/duplicate-detection.service.ts:71-107`  
  - `src/duplicate-detection/duplicate-detection.service.ts:208-236`

Conclusion:
- Raw/cleaned/features/results pipeline is now materially wired in runtime job flow.

---

6) **Critical input validation is inconsistent**  
**Status: Not fixed**

Evidence of inconsistency:
- Idempotency headers are required by service logic but not strongly typed/validated via DTO/header pipes at controller boundary:  
  - `src/reservations/reservations.controller.ts:30,56`  
  - `src/enrollments/enrollments.controller.ts:43,57,89`
- Several date fields remain plain strings (`@IsString`) rather than strict date validators in content APIs:  
  - `src/content/content.controller.ts:51-56`  
  - `src/content/content.controller.ts:81-86`
- Query filters like `status` are unbounded strings (no enum validation):  
  - `src/enrollments/enrollments.controller.ts:102`  
  - `src/offerings/offerings.controller.ts:117`

Conclusion:
- Global `ValidationPipe` exists, but endpoint-level DTO rigor is still uneven for headers/dates/enums.

---

7) **Documentation does not fully match the code**  
**Status: Not fixed**

Evidence:
- Route inventory internal mismatch: enrollment table lists 6 routes, summary row lists 5.  
  - `docs/route-inventory.md:124`  
  - `docs/route-inventory.md:158`
- Design doc says download endpoint does not require session, but implementation requires authenticated user and token user match:  
  - `docs/design.md:296`  
  - `src/files/files.controller.ts:27-30`  
  - `src/files/files.controller.ts:37`

Conclusion:
- Documentation drift remains and is auditable.

---

8) **Test suite overstates real coverage**  
**Status: Partially fixed (risk remains)**

What improved:
- There are real API test files using Nest app + Supertest (`API_tests/*.api.spec.ts`).

Remaining gap:
- Coverage is still largely unit/mocked; documents explicitly acknowledge runtime integration gaps.  
  - `docs/test-coverage.md:3`  
  - `docs/test-coverage.md:74`  
  - `docs/test-coverage.md:78`
- Representative “critical” tests still use mocked/in-memory simulation rather than DB locking/runtime behavior:  
  - `repo/unit_tests/enrollment/approval-flow.spec.ts:18-19`  
  - `repo/unit_tests/enrollment/approval-flow.spec.ts:36`  
  - `repo/unit_tests/idempotency/idempotency-isolation.spec.ts:10-11`

Conclusion:
- Better than purely synthetic, but still not enough to fully dismiss the original coverage-quality concern.

## Commands Executed for Verification

- Build: `npm run build` (pass)
- Targeted tests:  
  - `npm run test:unit -- --watchman=false unit_tests/idempotency/idempotency-isolation.spec.ts unit_tests/enrollment/approval-flow.spec.ts unit_tests/files/file-sniffing.spec.ts`  
  - Result: 3 suites passed, 32 tests passed

## Overall Verdict

The previously reported **Blockers** on dependency wiring and idempotency isolation appear fixed.  
However, one item (manual approval seat accounting consistency) is only partially resolved and still carries correctness risk in mixed approval paths.  
Documentation alignment and validation consistency remain open and should be treated as active remediation items.
