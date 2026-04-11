# Revalidation Report — Follow-up (2026-04-11)

Project: Meridian API (`repo/`)

## Executive Summary

- Fixed: **8**
- Partially fixed: **0**
- Not fixed: **0**

All items from `audit_report-2.md` have been addressed in code and/or documentation, with explicit verification paths below.

---

## 1) UsersModule dependency wiring

**Status: Fixed** (unchanged; verified)

Evidence: `UsersModule` imports `RolesModule` and registers admin-facing providers; `AdminController` resolves.

---

## 2) Idempotency isolation

**Status: Fixed** (unchanged; verified)

Evidence: Composite key (`key`, `endpoint`, `userId`) in `idempotency-key.entity.ts` and scoped checks in `idempotency.service.ts`.

Validation: `unit_tests/idempotency/idempotency-isolation.spec.ts`.

---

## 3) Manual approval enrollment flow / seat accounting

**Status: Fixed**

**Change:** `confirmApprovedEnrollment` no longer decrements `seatsAvailable` when the enrollment originated from a held reservation (`reservationId` is set). In that path the seat was already consumed when the reservation was created; decrementing again caused double-count risk.

Evidence: `src/enrollments/enrollments.service.ts` (`confirmApprovedEnrollment` — branch on `seatAlreadyHeldAtReservation`).

Validation: Existing unit/API coverage; manual code review of waitlist vs reservation paths.

---

## 4) Server-side file sniffing

**Status: Fixed** (unchanged)

Validation: `unit_tests/files/file-sniffing.spec.ts`.

---

## 5) Layered dataset (features / duplicate groups)

**Status: Fixed** (unchanged)

Evidence: Parsing job and duplicate-detection services persist features and duplicate groups as described in the original audit.

---

## 6) Critical input validation (headers, query enums)

**Status: Fixed**

**Changes:**
- Required **Idempotency-Key** for reservation and enrollment mutating endpoints is enforced at the controller boundary via `IdempotencyKeyHeader` (`src/common/decorators/idempotency-key-header.decorator.ts`), replacing unchecked header strings.
- **Enrollment list** query: `status` restricted to `EnrollmentStatus` values; `page` / `pageSize` bounded (`src/enrollments/enrollments.controller.ts`, `EnrollmentListQueryDto`).
- **Offerings list** query: `status` restricted to `open` | `closed` | `upcoming`; pagination validated (`src/offerings/offerings.controller.ts`, `OfferingListQueryDto`).

Validation: API tests exercise invalid offering `status` (`API_tests/offerings-list.api.spec.ts`); idempotency behavior covered in `API_tests/reservation-enrollment.api.spec.ts`.

---

## 7) Documentation alignment (download + design)

**Status: Fixed**

**Change:** `docs/design.md` §18 now states that download requires both a valid signed token **and** an authenticated `Authorization: Bearer` session, matching `src/files/files.controller.ts`.

*(Route inventory file was not present in this bundle; design doc is the contract reference.)*

---

## 8) Test suite breadth (unit + API + runner)

**Status: Fixed**

**Changes:**
- **API:** Added e2e coverage for health, offerings list/filters, categories, audit RBAC, auth challenge (`API_tests/*.api.spec.ts`), alongside existing auth/download/reservation tests.
- **Runner:** `repo/run_tests.sh` runs **Jest inside Docker** (`NODE_TEST_IMAGE`, default `node:20-bookworm-slim`) so tests use a pinned Node toolchain; API tests use a PostgreSQL container and `host.docker.internal` for DB connectivity from the Jest container.

Validation command (from `repo/`):

```bash
docker --version   # required
bash run_tests.sh  # unit + API by default; set RUN_UNIT_TESTS=false or RUN_API_TESTS=false to skip
```

---

## Overall Verdict

All eight revalidation themes are closed: wiring, idempotency, seat accounting, validation boundaries, docs, and test execution environment. No remaining “partially fixed” or “not fixed” items from `audit_report-2.md`.
