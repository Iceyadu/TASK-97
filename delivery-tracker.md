# Delivery Tracker

## Phase 1: Design & Documentation — COMPLETE

All design documents created and reviewed.

## Phase 2: Core Implementation — COMPLETE

| Deliverable | Status | Evidence |
|---|---|---|
| NestJS project bootstrap | Complete | `src/main.ts`, `src/app.module.ts` |
| 18 NestJS modules | Complete | One module per domain concern |
| 25 TypeORM entities | Complete | All entities with indexes and constraints |
| Auth module (login, session, password, lockout, PoW, reset) | Complete | `src/auth/` |
| RBAC with 4 roles | Complete | `src/roles/`, `src/common/guards/` |
| Content module (upload, version, rollback, lineage) | Complete | `src/content/` |
| Parsing (EPUB, PDF, TXT) | Complete | `src/parsed-documents/parsing.service.ts` |
| Categories (materialized path) | Complete | `src/categories/` |
| Tags | Complete | `src/tags/` |
| Offerings (capacity, windows, eligibility) | Complete | `src/offerings/` |
| Reservations (hold, release, pessimistic locking) | Complete | `src/reservations/` |
| Enrollments (confirm, cancel, approve, waitlist) | Complete | `src/enrollments/` |
| Duplicate detection (SHA-256, MinHash) | Complete | `src/duplicate-detection/` |
| Idempotency (24h dedup, callback protection) | Complete | `src/idempotency/` |
| File security (allowlist, sniffing, structural validation) | Complete | `src/files/` |
| Download tokens (HMAC, 15-min expiry) | Complete | `src/files/download-token.service.ts` |
| Encryption (AES-256-GCM, key rotation) | Complete | `src/encryption/` |
| Audit (all writes, trace IDs) | Complete | `src/audit/` |
| 3 scheduled job classes | Complete | `src/jobs/` |
| Docker (Dockerfile + docker-compose) | Complete | `repo/Dockerfile`, `repo/docker-compose.yml` |
| Unit tests: 23 suites, 249 tests | Complete | `repo/unit_tests/` |

## Phase 3: Hardening & Final Delivery — COMPLETE

| Deliverable | Status |
|---|---|
| Missing routes added (merge, parsed, duplicates, offering enrollments/waitlist) | Complete |
| Input validation on all create/update endpoints | Complete |
| Error envelope consistency (400/401/403/404/409/422/429) | Complete |
| Documentation finalized (9 docs + README) | Complete |
| Session files updated | Complete |
| Test coverage expanded to 249 tests | Complete |
| Cleanup (.gitignore, no junk artifacts) | Complete |
| reviewer-notes.md with exact file pointers | Complete |
| Manual Verification Required items documented | Complete |

## Requirement Completion Matrix

| Requirement | Status | Evidence |
|---|---|---|
| NestJS + TypeORM + PostgreSQL | Complete | package.json, all modules |
| Local username/password auth | Complete | src/auth/ |
| Session issuance | Complete | session.entity.ts, auth.service.ts |
| Password policy (12 chars, complexity) | Complete | password.validator.ts + 12 tests |
| Admin credential reset | Complete | auth.service.ts:adminResetPassword |
| Brute-force lockout (10/15min/30min) | Complete | lockout.service.ts + 8 tests |
| Rate limiting (20/IP/10min) | Complete | rate-limit.guard.ts + 6 tests |
| Proof-of-work challenge | Complete | pow.service.ts + 7 tests |
| RBAC (4 roles) | Complete | roles.guard.ts, roles.service.ts |
| Content upload with file validation | Complete | file-validator.service.ts + 18 tests |
| EPUB/PDF/TXT parsing | Complete | parsing.service.ts + 8 tests |
| Semantic versioning (major.minor.patch) | Complete | content.service.ts + 9 tests |
| 180-day rollback | Complete | content.service.ts:rollback + tests |
| Lineage tracking | Complete | content-lineage.entity.ts |
| Duplicate detection (SHA-256) | Complete | duplicate-detection.service.ts + 10 tests |
| Near-duplicate (MinHash >= 0.8) | Complete | duplicate-detection.service.ts + tests |
| Canonical merge | Complete | duplicate-detection.service.ts:mergeCanonical |
| Offerings (1-5000 seats, windows, eligibility) | Complete | offerings.service.ts + 9 tests |
| Reservation hold (10 min, auto-release) | Complete | reservations.service.ts |
| Enrollment state machine (6 states) | Complete | enrollments.service.ts + 15 tests |
| Duplicate enrollment prevention | Complete | Partial unique index + service check |
| Idempotency (24h dedup) | Complete | idempotency.service.ts + 12 tests |
| Internal callback dedup | Complete | callback-dedup.spec.ts + 6 tests |
| AES-256-GCM encryption | Complete | encryption.service.ts + 8 tests |
| Response masking | Complete | masking.interceptor.ts + 10 tests |
| Audit trail (all writes) | Complete | audit.service.ts + 4 tests |
| Trace ID propagation | Complete | trace-id.interceptor.ts + 3 tests |
| Download tokens (15-min, HMAC) | Complete | download-token.service.ts + 6 tests |
| Docker single-host offline | Complete | Dockerfile, docker-compose.yml |
| Scheduled jobs (7 jobs) | Complete | src/jobs/ |
