# Jobs and Scheduling

## Overview

All background jobs run in-process using `@nestjs/schedule` (cron-based). No external queue or message broker is required. Jobs are registered at application startup and execute within the NestJS process.

## Job Inventory

### 1. Reservation Expiry (Seat Release)

| Property | Value |
|---|---|
| **Name** | `ReservationExpiryJob` |
| **Schedule** | Every 1 minute |
| **Trigger** | Cron: `*/1 * * * *` |
| **Description** | Finds all reservations with `status = 'HELD'` and `expires_at < NOW()`, transitions them to `RELEASED`, and returns seats to the offering pool. |
| **Idempotency** | Each reservation is processed exactly once. The job uses a `SELECT ... FOR UPDATE SKIP LOCKED` query to prevent double-processing in edge cases. The state transition from HELD to RELEASED is atomic. |
| **Deduplication** | Uses the reservation's `idempotency_key` to check if a release has already been recorded. |
| **Retry** | If a release fails (DB error), the reservation remains in `HELD` state and will be retried on the next cron tick. |
| **Side Effects** | Increments `offerings.seats_available`. Creates `enrollment_state_transitions` record (actor = SYSTEM). Creates `audit_events` record. If `waitlist_enabled`, triggers waitlist promotion. |
| **Concurrency** | Single-threaded (one instance per cron tick). Uses DB-level locking to prevent race conditions. |

### 2. Waitlist Promotion

| Property | Value |
|---|---|
| **Name** | `WaitlistPromotionJob` |
| **Schedule** | Triggered by seat release (piggybacked on ReservationExpiryJob), also runs every 5 minutes as a safety sweep |
| **Trigger** | Called after seat release; Cron: `*/5 * * * *` |
| **Description** | For offerings with available seats and waitlisted users, promotes the next user in FIFO order. If `requires_approval = false`, moves to CONFIRMED. If `requires_approval = true`, moves to APPROVED. |
| **Idempotency** | Each promotion generates an idempotency key: `waitlist-promote-{enrollment_id}-{offering_id}`. This prevents double-promotion if the job runs concurrently with a manual approval. |
| **Deduplication** | Checks idempotency key table before processing. |
| **Retry** | Failed promotions remain in WAITLISTED state, retried on next sweep. |
| **Side Effects** | Updates enrollment status. Decrements `offerings.seats_available` (if auto-confirming). Creates state transition and audit records. |

### 3. Session Cleanup

| Property | Value |
|---|---|
| **Name** | `SessionCleanupJob` |
| **Schedule** | Every 1 hour |
| **Trigger** | Cron: `0 * * * *` |
| **Description** | Deletes sessions where `expires_at < NOW()`. |
| **Idempotency** | DELETE is inherently idempotent. No idempotency key needed. |
| **Retry** | Automatic on next cron tick. |
| **Side Effects** | None beyond cleanup. No audit record (session expiry is not a user action). |

### 4. Idempotency Key Purge

| Property | Value |
|---|---|
| **Name** | `IdempotencyKeyPurgeJob` |
| **Schedule** | Every 6 hours |
| **Trigger** | Cron: `0 */6 * * *` |
| **Description** | Deletes idempotency keys where `created_at < NOW() - INTERVAL '24 hours'`. |
| **Idempotency** | DELETE is inherently idempotent. |
| **Retry** | Automatic on next cron tick. |
| **Side Effects** | None. After 24 hours, the deduplication window has passed. |

### 5. Proof-of-Work Challenge Purge

| Property | Value |
|---|---|
| **Name** | `PowChallengePurgeJob` |
| **Schedule** | Every 1 hour |
| **Trigger** | Cron: `0 * * * *` |
| **Description** | Deletes challenges where `expires_at < NOW() - INTERVAL '1 hour'` (1 hour buffer after expiry). |
| **Idempotency** | DELETE is inherently idempotent. |
| **Retry** | Automatic on next cron tick. |
| **Side Effects** | None. |

### 6. Content Parsing

| Property | Value |
|---|---|
| **Name** | `ContentParsingJob` |
| **Schedule** | Event-driven (enqueued after upload), plus every 5 minutes sweep for any unparsed versions |
| **Trigger** | Direct invocation after upload; Cron: `*/5 * * * *` |
| **Description** | Parses uploaded files (EPUB, PDF, TXT) into structured chapters and text segments. Computes content hashes and features. |
| **Idempotency** | Keyed on `content_asset_version_id`. If parsed_documents already exist for a version, the job is skipped. |
| **Retry** | Failed parsing sets a `parse_status = 'FAILED'` flag on the version. The sweep job retries up to 3 times. After 3 failures, status is set to `PARSE_ERROR` and an audit event is created. |
| **Side Effects** | Creates `parsed_documents` rows. Creates `content_features` rows. Triggers duplicate detection. Creates audit event on failure. |

### 7. Duplicate Detection

| Property | Value |
|---|---|
| **Name** | `DuplicateDetectionJob` |
| **Schedule** | Triggered after content parsing completes; also runs every 15 minutes as a sweep |
| **Trigger** | Called after parsing; Cron: `*/15 * * * *` |
| **Description** | For newly parsed documents, checks for exact duplicates (hash match) and near-duplicates (MinHash similarity >= 0.8). |
| **Idempotency** | Keyed on `content_asset_version_id`. If duplicate detection results already exist, the job is skipped. |
| **Retry** | Failed detection retried on next sweep, up to 3 attempts. |
| **Side Effects** | Creates `duplicate_links` rows. May create `duplicate_groups` rows. Creates audit event for detected duplicates. |

### 8. Login Attempt Cleanup

| Property | Value |
|---|---|
| **Name** | `LoginAttemptCleanupJob` |
| **Schedule** | Every 1 hour |
| **Trigger** | Cron: `0 * * * *` |
| **Description** | Deletes login_attempts older than 24 hours (well beyond the 15-minute lockout window). |
| **Idempotency** | DELETE is inherently idempotent. |
| **Retry** | Automatic on next cron tick. |
| **Side Effects** | None. |

## Scheduler Registration

All jobs are registered as `@Cron()` decorated methods in their respective service classes, using the `@nestjs/schedule` `ScheduleModule`. The module is imported once in `AppModule`.

```typescript
// Example registration pattern
@Injectable()
export class ReservationService {
  @Cron('*/1 * * * *')
  async handleExpiredReservations() { ... }
}
```

## Job Execution Guarantees

| Guarantee | Implementation |
|---|---|
| **No duplicate processing** | `SELECT ... FOR UPDATE SKIP LOCKED` on the target rows prevents concurrent processing of the same record. |
| **Idempotent side effects** | Idempotency keys used for jobs that create enrollments or modify seat counts. |
| **Failure isolation** | Each record is processed independently. One failure does not block processing of other records. |
| **Observability** | Each job execution creates a trace ID. Start/end/error logged with trace ID. Failed jobs create audit events. |
| **No external dependencies** | All jobs run in-process. No Redis, RabbitMQ, or external scheduler required. |

## Internal Callback Deduplication

Scheduled jobs that trigger side effects (e.g., seat release triggering waitlist promotion) use idempotency keys to prevent double-processing:

1. The seat release job generates an idempotency key: `seat-release-{reservation_id}`.
2. Before promoting from waitlist, the promotion logic checks the idempotency key table.
3. If the key exists (within 24-hour window), the promotion is skipped.
4. This handles the case where a manual seat release and a scheduled release race.

## Job Timeline

```
Every 1 min:   [ReservationExpiry] ──▶ [WaitlistPromotion (if seats freed)]
Every 5 min:   [WaitlistPromotion sweep] [ContentParsing sweep]
Every 15 min:  [DuplicateDetection sweep]
Every 1 hour:  [SessionCleanup] [PowChallengePurge] [LoginAttemptCleanup]
Every 6 hours: [IdempotencyKeyPurge]
```
