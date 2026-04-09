# Performance & Non-Functional Requirements

## Targets

- **p95 latency:** < 300 ms for typical queries under 200 concurrent requests
- **Deployment:** Single Docker host, fully offline
- **Rate limiting:** 20 login attempts per IP per 10 minutes
- **Brute-force lockout:** 10 failed logins in 15 minutes, 30-minute cooldown
- **File size limit:** 250 MB per upload
- **Download token expiry:** 15 minutes
- **Reservation hold:** 10 minutes
- **Idempotency window:** 24 hours

---

## p95 < 300 ms — Static Evidence

| Strategy | Where to Verify | Impact |
|---|---|---|
| **Database indexes** | All entity files (`@Index` decorators) | Query paths use indexed columns |
| **Partial indexes** | `enrollment.entity.ts` line `WHERE status != 'CANCELED'` | Smaller index for uniqueness checks |
| **Pagination** | All `findAll` service methods cap `pageSize` at 100 | No unbounded result sets |
| **Connection pooling** | `database.module.ts` → `extra: { max: 20 }` | Connection reuse |
| **Async parsing** | `content-parsing.job.ts` runs in background | Upload response not blocked by parsing |
| **Selective column loading** | QueryBuilder with explicit joins | No `SELECT *` on large tables |
| **Atomic seat operations** | `SET seatsAvailable = seatsAvailable - 1` | No read-modify-write roundtrip |
| **Pessimistic row locking** | `setLock('pessimistic_write')` in reservation/enrollment | Prevents contention without retries |

### Manual Verification Required

| Aspect | Why |
|---|---|
| **Actual p95 under 200 concurrent requests** | Depends on hardware, data volume, query plans. Requires k6/artillery load test. |
| **Connection pool sizing** | Optimal size depends on hardware cores and query patterns. |
| **Background job CPU impact** | Jobs share Node.js event loop with requests. |
| **PostgreSQL query plan efficiency** | Plans change with data distribution. Run `EXPLAIN ANALYZE` on production data. |

---

## Rate Limiting — Static Evidence

| Requirement | Implementation | File |
|---|---|---|
| 20 login/IP/10min | Sliding window counter | `src/common/guards/rate-limit.guard.ts` |
| General API throttling | Configurable per-user limit | `src/config/config.service.ts` |

**Test evidence:** `unit_tests/auth/rate-limit.spec.ts` — 6 tests: 20 requests pass, 21st fails with 429, different IPs independent.

---

## Brute-Force Lockout — Static Evidence

| Requirement | Implementation | File |
|---|---|---|
| 10 failures / 15 min → lock | Count query on `login_attempts` within window | `src/auth/lockout.service.ts` |
| 30-min cooldown | `users.lockedUntil` timestamp comparison | `src/auth/lockout.service.ts:isLocked()` |
| Auto-unlock | Time-based check, no job needed | `user.entity.ts:isLocked()` |

**Test evidence:** `unit_tests/auth/lockout.spec.ts` — 8 tests: 9 failures = not locked, 10 = locked, 30-min duration, auto-unlock.

**Lockout check order:** Lockout check happens BEFORE password verification in `auth.service.ts:login()` to avoid timing attacks.

---

## Concurrency — Static Evidence

| Concern | Mitigation | File |
|---|---|---|
| Last-seat race | `setLock('pessimistic_write')` on offering | `reservations.service.ts:createReservation()` |
| Double enrollment | Unique partial index + service-level check | `enrollment.entity.ts` + `enrollments.service.ts` |
| Seat count drift | Atomic `SET x = x - 1` (not read-modify-write) | `reservations.service.ts` |
| Job double-execution | Re-check status inside transaction with lock | `reservations.service.ts:releaseExpiredReservations()` |

### Manual Verification Required

Concurrent thread stress testing for the pessimistic locking pattern.

---

## Offline Compliance — Static Evidence

| Check | How to Verify |
|---|---|
| No outbound network calls | `grep -r "https\?://" src/` returns zero (excluding test mocks) |
| No cloud SDK dependencies | Review `package.json` — no AWS, GCP, Azure packages |
| No external API calls | No `fetch(`, `axios.`, `http.request` in `src/` |
| Docker self-contained | `docker-compose.yml` has no external networks |
| npm deps pre-installed | Dockerfile multi-stage build, no runtime `npm install` |

---

## Summary: Static vs. Runtime Verification

| Category | Statically Verifiable | Manual Verification Required |
|---|---|---|
| Index definitions match queries | Yes | — |
| Pagination on all list endpoints | Yes | — |
| Connection pool configuration | Yes | Optimal sizing |
| Rate limit logic and thresholds | Yes | — |
| Lockout logic and thresholds | Yes | — |
| Concurrency controls (locking) | Yes | Stress test |
| Offline compliance | Yes | — |
| Actual p95 < 300 ms | — | Load test required |
| Background job impact on latency | — | Profiling required |
| Docker container health | — | Runtime startup required |
