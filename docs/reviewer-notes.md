# Reviewer Notes — Final

## Evidence Pointer Index

### Authentication & Session Issuance
- `src/auth/auth.service.ts:login()` — bcrypt compare, session creation (UUID token, configurable TTL)
- `src/auth/session.entity.ts` — sessions table with token, expiresAt, userId FK
- `src/common/guards/auth.guard.ts` — Bearer token validation, session lookup, user loading
- **Tests:** lockout.spec.ts, rate-limit.spec.ts, pow.spec.ts

### Password Complexity & Lockout
- `src/common/validators/password.validator.ts` — regex for 12+ chars, upper/lower/digit/symbol
- `src/auth/auth.service.ts:register()`, `changePassword()`, `redeemResetToken()` — all three call `assertPasswordComplexity()`
- `src/auth/lockout.service.ts:checkAndLock()` — counts failures in 15-min window, locks for 30 min
- `src/auth/auth.service.ts:login()` — lockout check BEFORE password verify (line ~43)
- **Tests:** password-validator.spec.ts (12), lockout.spec.ts (8)

### Rate Limiting & Proof-of-Work
- `src/common/guards/rate-limit.guard.ts` — sliding window, 20 max, 10-min window
- `src/auth/pow.service.ts` — SHA-256 prefix puzzle, configurable difficulty, single-use enforcement
- `src/auth/auth.controller.ts:login()` — `@UseGuards(RateLimitGuard)` on login route
- **Tests:** rate-limit.spec.ts (6), pow.spec.ts (7)

### Admin Credential Reset
- `src/auth/auth.service.ts:adminResetPassword()` — generates UUID token, stores SHA-256 hash, 1-hour expiry
- `src/auth/auth.service.ts:redeemResetToken()` — validates hash, single-use, password complexity enforced
- `src/users/admin.controller.ts:resetPassword()` — admin-only route with `@Roles('admin')`
- **Tests:** implicitly via auth service tests

### RBAC & Object-Level Authorization
- `src/common/guards/roles.guard.ts` — checks user roles against `@Roles()` decorator
- `src/common/decorators/roles.decorator.ts` — `@Roles('admin', 'content_manager', ...)`
- Every protected controller uses `@UseGuards(RolesGuard)` + `@Roles(...)` on mutating routes
- `src/common/guards/auth.guard.ts` — loads user with roles via session relation
- Ownership checks in services (e.g., `reservations.service.ts` checks `reservation.userId !== userId`)

### Content Upload Validation
- `src/files/file-validator.service.ts:validateExtension()` — allowlist: .epub/.pdf/.txt/.mp4/.mp3
- `src/files/file-validator.service.ts:validateMagicBytes()` — magic byte verification per type
- `src/files/file-validator.service.ts:validateSize()` — 250 MB limit
- `src/files/file-validator.service.ts:sanitizeFilename()` — path traversal, null bytes, control chars
- `src/files/file-validator.service.ts:validateStructure()` — PDF dangerous keywords, EPUB executables
- **Tests:** file-validator.spec.ts (18)

### Secure File Handling
- `src/files/files.service.ts:storeFile()` — orchestrates: validate → hash → store → structural check
- `src/files/file-validator.service.ts:validatePdfStructure()` — scans for /JavaScript, /JS, /Launch, /EmbeddedFile
- `src/files/file-validator.service.ts:validateEpubStructure()` — checks for .exe/.bat/.cmd/.sh/.ps1/.vbs/.js
- Rejection logged via `auditService.recordEvent({ action: 'file.structural_validation_failed' })`

### Parsing Pipeline
- `src/parsed-documents/parsing.service.ts` — PDF (pdf-parse), EPUB (XML extraction), TXT (paragraph split)
- `src/parsed-documents/parsing.service.ts:normalizeText()` — lowercase, strip punctuation, collapse whitespace
- `src/parsed-documents/parsing.service.ts:computeContentHash()` — SHA-256 on normalized text
- `src/jobs/content-parsing.job.ts` — background job, 5-min sweep, 3 retries before PARSE_ERROR
- **Tests:** parsing.spec.ts (8)

### Version Creation & Rollback
- `src/content/content.service.ts:updateAsset()` — creates new version, marks old as not-current, records lineage
- `src/content/content.service.ts:rollback()` — 180-day window check, creates NEW version (never mutates), ROLLBACK lineage
- `src/content/content.service.ts:bumpVersion()` — patch/minor/major rules
- `src/content/content-lineage.entity.ts` — derived/merged/rollback/extracted relationships
- **Tests:** versioning.spec.ts (9), lifecycle.spec.ts (12)

### Duplicate & Near-Duplicate Processing
- `src/duplicate-detection/duplicate-detection.service.ts:detectExactDuplicates()` — SHA-256 hash match
- `src/duplicate-detection/duplicate-detection.service.ts:detectNearDuplicates()` — MinHash (128 perms, 5-word shingles, 0.8 threshold)
- `src/duplicate-detection/duplicate-detection.service.ts:mergeCanonical()` — creates canonical_links, preserves originals
- `src/jobs/content-parsing.job.ts` — triggers detection after parsing
- **Tests:** duplicate-detection.spec.ts (10)

### Canonical Merge Preservation
- `src/duplicate-detection/canonical-link.entity.ts` — sourceAssetId (unique), canonicalAssetId, mergedBy
- `src/duplicate-detection/duplicate-detection.service.ts:mergeCanonical()` — never deletes sources
- Audit event: `{ action: 'duplicate.merge' }`

### Offering Validation
- `src/offerings/offerings.service.ts:create()` — seat capacity 1-5000, window end > start
- `src/offerings/offerings.service.ts:update()` — cannot reduce below used seats
- `src/offerings/offering.entity.ts:isWindowOpen()` — enrollment window check
- **Tests:** offering-validation.spec.ts (9), eligibility.spec.ts (17)

### Reservation Auto-Release
- `src/reservations/reservations.service.ts:releaseExpiredReservations()` — finds HELD with expiresAt < NOW()
- Re-checks status inside transaction with `setLock('pessimistic_write')`
- Returns seat via atomic `SET seatsAvailable = seatsAvailable + 1`
- `src/jobs/reservation-expiry.job.ts` — `@Cron('*/1 * * * *')`
- Triggers waitlist promotion after releases

### Enrollment Confirmation
- `src/enrollments/enrollments.service.ts:confirmReservation()` — checks: exists, HELD status, not expired, user match, no duplicate enrollment
- Wraps in transaction with pessimistic lock on reservation row
- Creates enrollment with CONFIRMED status, marks reservation as CONVERTED

### Duplicate Enrollment Rejection
- `enrollment.entity.ts` — `@Index('idx_enrollments_offering_user', ['offeringId', 'userId'], { unique: true, where: "status != 'CANCELED'" })`
- `reservations.service.ts:createReservation()` — checks existing reservation AND enrollment before creating
- `enrollments.service.ts:confirmReservation()` — checks existing non-canceled enrollment

### Idempotency Deduplication
- `src/idempotency/idempotency.service.ts:check()` — lookup within 24h window
- `src/idempotency/idempotency.service.ts:store()` — INSERT with duplicate key catch (code 23505)
- Used in: reservation create, reservation release, enrollment confirm, enrollment cancel
- **Tests:** idempotency.spec.ts (6), callback-dedup.spec.ts (6)

### Duplicate Internal Callback Handling
- Seat release job generates idempotency key `seat-release-{reservation_id}`
- Waitlist promotion checks `waitlist-promote-{enrollment_id}-{offering_id}`
- Prevents double-processing when timer and manual action race
- **Tests:** callback-dedup.spec.ts (6)

### Secure Download Token Expiry
- `src/files/download-token.service.ts:generateToken()` — HMAC-SHA256, 15-min expiry
- `src/files/download-token.service.ts:validateToken()` — signature + expiry check
- `src/files/files.controller.ts:download()` — `@Public()` endpoint, token is the credential
- **Tests:** download-token.spec.ts (6)

### AES-256 Encryption Usage
- `src/encryption/encryption.service.ts` — AES-256-GCM, random 12-byte IV, auth tag
- Format: `iv:authTag:ciphertext` (base64)
- Two-key rotation: current + previous key support
- **Tests:** encryption.spec.ts (8)

### Masking Behavior
- `src/common/interceptors/masking.interceptor.ts` — global response interceptor
- Strips: password_hash, passwordHash, reset_token_hash, resetTokenHash
- Masks to last-4: governmentId, employeeId
- Handles nested objects and arrays
- **Tests:** masking.spec.ts (10)

### Audit Events & Trace IDs
- `src/audit/audit.service.ts:recordEvent()` — all write operations call this
- `src/common/interceptors/audit.interceptor.ts` — auto-audits POST/PUT/PATCH/DELETE
- `src/common/interceptors/trace-id.interceptor.ts` — UUID per request via AsyncLocalStorage
- 22+ distinct audit action types across all services
- **Tests:** audit.spec.ts (7), trace-id.spec.ts (3)

---

## Test Suite Summary

**23 suites, 249 tests, all passing.**

Run: `npx jest --config jest.unit.config.js`
