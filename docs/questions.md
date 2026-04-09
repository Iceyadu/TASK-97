# Design Questions & Decisions

---

## Q1: Session token format — JWT vs opaque token

Question:
The spec says "session issuance" but does not specify JWT or opaque tokens. JWTs enable stateless validation but cannot be revoked without a denylist. Opaque tokens require a DB lookup per request but support instant revocation.

My Understanding:
For an offline single-host system, the performance benefit of JWTs is minimal since all traffic hits one process. Revocation (logout, admin lockout) is a hard requirement for security. A DB-backed opaque token avoids the complexity of JWT secret rotation and denylist management.

Solution:
Use opaque session tokens (UUID v4) stored in a PostgreSQL `sessions` table. Session validation is a single indexed lookup per request. Logout and lockout invalidate by deleting/expiring the session row. A scheduled job cleans expired sessions hourly.

---

## Q2: Enrollment window date format — MM/DD/YYYY vs ISO 8601

Question:
The spec states enrollment windows use "MM/DD/YYYY date-time range." The API receives and returns JSON. Using a non-standard date format in JSON creates parsing ambiguity and timezone confusion.

My Understanding:
The MM/DD/YYYY requirement likely reflects business documentation conventions, not a wire format mandate. Internally and in the API, ISO 8601 is standard for JSON APIs and eliminates ambiguity. The MM/DD/YYYY format should be accepted as input for compatibility but the system should normalize to ISO 8601.

Solution:
API accepts both `MM/DD/YYYY HH:mm` and ISO 8601 for enrollment window fields. All internal storage and responses use ISO 8601 with timezone (TIMESTAMPTZ in PostgreSQL). Validation rejects ambiguous or unparseable date strings.

---

## Q3: Waitlist promotion — automatic vs manual-only

Question:
The spec says "waitlist behavior" and "optional manual approval" but does not fully define whether waitlisted users are automatically promoted when a seat opens, or if an enrollment manager must always approve.

My Understanding:
The offering has a `requires_approval` flag. When false, waitlist promotion should be automatic. When true, a manager must explicitly approve. This satisfies both the "controlled enrollment" and "optional manual approval" requirements.

Solution:
When a seat is released and `requires_approval = false`: the next waitlisted user is automatically moved to `APPROVED` status and then immediately to `CONFIRMED` if they had a pending reservation. When `requires_approval = true`: the next waitlisted user is moved to `APPROVED` and must explicitly confirm within a new 10-minute window. Automatic promotion is handled by the seat-release background job.

---

## Q4: Semantic version auto-increment rules

Question:
The spec requires "semantic version strings for content (major.minor.patch)" but does not define what constitutes a major, minor, or patch change.

My Understanding:
Content versioning differs from software versioning. A reasonable mapping: patch = metadata-only changes (title, tags, dates), minor = new file upload / re-parse (structural content change), major = admin-designated breaking change or significant rewrite.

Solution:
- **Patch bump:** Metadata-only update (title, author, tags, categories, effective dates) without new file upload.
- **Minor bump:** New file uploaded for the same asset, re-triggering parsing.
- **Major bump:** Explicit admin override via `"bumpMajor": true` in the update request.
- Version starts at `1.0.0` for initial upload.
- Rollback creates a new version with a minor bump (since it changes the current content).

---

## Q5: Near-duplicate shingle overlap — performance at scale

Question:
Near-duplicate detection via MinHash/shingle overlap on every new document against all existing documents could be O(n) comparisons. What is the expected corpus size and acceptable detection latency?

My Understanding:
The spec targets a single-host system with "200 concurrent requests" which suggests a moderate corpus (likely thousands, not millions, of documents). MinHash with 128 permutations and a simple linear scan against stored signatures is feasible for this scale. LSH (Locality Sensitive Hashing) banding can be added if needed.

Solution:
Initial implementation: after parsing, compute MinHash signature (128 permutations, 5-word shingles), store in `content_features.shingle_hashes` as JSONB. A background job compares the new document's MinHash against all existing signatures in batches. For the target scale (< 100K documents), this completes within seconds. If profiling shows bottlenecks, add LSH banding as an optimization. The detection job runs asynchronously and does not block the upload response.

---

## Q6: Encryption key rotation strategy

Question:
The spec requires AES-256 encryption at rest with a local key. How should key rotation be handled? Is there a requirement for periodic rotation?

My Understanding:
The spec doesn't mention rotation, but a static forever-key is a security risk. However, this is an offline single-host system, so key management must be simple. A two-key approach (current + previous) allows rotation without downtime.

Solution:
Support two environment variables: `ENCRYPTION_KEY` (current) and `ENCRYPTION_KEY_PREVIOUS` (optional, for rotation). On read, if decryption with the current key fails, try the previous key. A manual migration command (`npm run rotate-keys`) re-encrypts all records with the new key. Rotation is documented but not automated on a schedule, since it requires operational intervention to set the new key.

---

## Q7: File download token scope — per-user or bearer-like

Question:
Download tokens are described as "authenticated download with expiring tokens." Should the token be scoped to the requesting user (only they can use it), or is it a bearer token anyone with the URL can use?

My Understanding:
Scoping to the user adds security (prevents URL sharing) but requires the download endpoint to validate a session. The spec says "authenticated download," implying user binding, but the purpose of a token is to enable sessionless download (e.g., streaming to a media player).

Solution:
Token is signed with the requesting user's ID embedded. The download endpoint verifies the signature and expiry but does NOT require a session. The user_id is logged for audit but not re-validated against a session — the token itself is the credential. This balances security (user-scoped, time-limited, signed) with usability (no session needed for download).

---

## Q8: Proof-of-work difficulty calibration

Question:
The spec says "CAPTCHA-style challenges implemented as local proof-of-work puzzles" but doesn't specify difficulty. Too easy = ineffective. Too hard = bad user experience.

My Understanding:
Difficulty 20 (20 leading zero bits) requires approximately 1 million hash computations, taking roughly 0.5-2 seconds on a modern client. This is enough to slow automated brute-force attacks without significantly impacting human users.

Solution:
Default difficulty: 20 (leading zero bits). Configurable via environment variable `POW_DIFFICULTY`. May be dynamically adjusted in future based on server load, but initial implementation uses a static value. The challenge expiry of 5 minutes gives clients ample time to solve.

---

## Q9: Idempotency key scope — per-user or global

Question:
Should idempotency keys be globally unique, or scoped per-user? A global key means two different users cannot coincidentally use the same key. Per-user scoping is more forgiving but requires composite lookup.

My Understanding:
Global uniqueness is simpler and avoids edge cases. UUID v4 collision probability is negligible. Since the key is the primary key, lookups are O(1) regardless.

Solution:
Idempotency keys are globally unique (primary key on the `idempotency_keys` table). The stored record also includes `user_id` and `endpoint` for audit purposes, but deduplication is based solely on the key value. If a different user submits the same key for the same endpoint, they receive a 409 Conflict (this should never happen with UUID v4 keys).

---

## Q10: Audit log retention and performance

Question:
The spec requires "complete audit logs for all write operations." Over time, the audit_events table could grow very large. Should there be retention limits or partitioning?

My Understanding:
The spec doesn't mention retention limits, and "complete" implies no deletions. For a single-host system, table partitioning by timestamp (monthly) keeps queries efficient without data loss. The 180-day rollback window for content suggests at minimum a 180-day active retention need.

Solution:
Implement PostgreSQL table partitioning on `audit_events` by month (range partitioning on `timestamp`). No automatic deletion — all audit records are retained. Partition pruning ensures queries scoped by date range remain fast. A configuration option for archiving old partitions (export to file) can be added later but is not required for initial delivery.
