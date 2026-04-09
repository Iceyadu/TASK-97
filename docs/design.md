# Meridian System Design

## 1. Business Goal

Provide a self-contained, offline-capable backend system for managing digital learning content (books, media, documents) and controlling enrollment into limited-seat learning offerings. The system must enforce strict data integrity, security, auditability, and content versioning requirements suitable for regulated or compliance-sensitive environments.

## 2. System Boundaries

- **In scope:** REST API server, PostgreSQL database, background job scheduler, file storage (local filesystem), Docker deployment.
- **Out of scope:** Frontend UI, external cloud services, third-party APIs, CDN, SaaS message queues, external CAPTCHA providers, external antivirus.
- **Single host:** All components (API, DB, job runner, file store) run on one Docker host.
- **Offline-first:** No outbound network calls. All parsing, hashing, validation, and scheduling performed locally.

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Docker Host                         │
│                                                      │
│  ┌──────────────┐   ┌──────────────┐                │
│  │  NestJS API  │──▶│  PostgreSQL  │                │
│  │  (Node.js)   │   │   (v15+)     │                │
│  └──────┬───────┘   └──────────────┘                │
│         │                                            │
│  ┌──────▼───────┐   ┌──────────────┐                │
│  │ Job Scheduler│   │  Local File  │                │
│  │ (in-process) │   │   Storage    │                │
│  └──────────────┘   │  /data/files │                │
│                      └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

**Key architecture decisions:**
- Single NestJS process with in-process job scheduling (node-cron or @nestjs/schedule) to avoid external queue dependencies.
- PostgreSQL as the sole persistence layer for relational data, audit logs, and job state.
- Local filesystem for uploaded binary files, organized by content asset UUID and version.
- No microservices. Monolithic NestJS application with clear module boundaries.

## 4. NestJS Module Decomposition

| Module | Responsibility |
|---|---|
| `AuthModule` | Login, session management, password policy, credential resets, rate limiting, proof-of-work, brute-force lockout |
| `UserModule` | User CRUD, role assignment, profile management |
| `RoleModule` | Role definitions, RBAC policy enforcement |
| `ContentModule` | ContentAsset CRUD, file upload/download, parsing pipeline, versioning, rollback |
| `ParsedDocumentModule` | Parsed text storage, chapter extraction, searchable segments |
| `CategoryModule` | Category tree CRUD, path indexing |
| `TagModule` | Tag CRUD, tag associations |
| `OfferingModule` | Offering CRUD, seat capacity, enrollment windows, eligibility |
| `ReservationModule` | Seat holds, auto-release, lock-then-confirm flow |
| `EnrollmentModule` | Enrollment confirmation, waitlist, approval, cancellation |
| `AuditModule` | AuditEvent recording, trace ID propagation, query interfaces |
| `FileModule` | Secure file storage, content sniffing, type validation, tokenized downloads |
| `DuplicateDetectionModule` | SHA-256 hashing, shingle overlap, canonical merge management |
| `EncryptionModule` | AES-256 field encryption, key management, response masking |
| `JobModule` | Scheduled job registration, execution, deduplication, retry |
| `IdempotencyModule` | Idempotency key storage, 24-hour deduplication window |
| `HealthModule` | Liveness/readiness probes for Docker |

**Cross-cutting concerns** (implemented as NestJS middleware, interceptors, or guards):
- `TraceIdInterceptor` — generates and propagates trace IDs on every request.
- `AuditInterceptor` — records write operations to AuditEvent.
- `RateLimitGuard` — enforces per-IP and per-account rate limits.
- `AuthGuard` — validates session tokens.
- `RolesGuard` — enforces RBAC.
- `MaskingInterceptor` — strips sensitive fields from responses.

## 5. Auth / Session Model

### Authentication Flow
1. Client submits `POST /auth/login` with `{ username, password }`.
2. Server validates credentials against stored salted hash (bcrypt, cost factor 12).
3. On success, server issues a session token (UUID v4) stored in `sessions` table with expiry (configurable, default 8 hours).
4. Client includes session token in `Authorization: Bearer <token>` header on subsequent requests.
5. `AuthGuard` validates token existence and expiry on protected routes.

### Session Storage
- Sessions stored in PostgreSQL `sessions` table: `id (UUID PK)`, `user_id (FK)`, `token (unique index)`, `expires_at`, `created_at`, `ip_address`, `user_agent`.
- Expired sessions cleaned up by scheduled job (hourly).

### Logout
- `POST /auth/logout` invalidates the session by deleting the row.

## 6. Local Credential Reset Model

- Only admins can trigger credential resets for other users.
- `POST /admin/users/:id/reset-password` generates a one-time reset token (UUID, stored hashed in DB, expires in 1 hour).
- The reset token is returned in the API response to the admin (no email, since offline).
- User redeems token via `POST /auth/reset-password` with `{ token, new_password }`.
- Token is single-use: consumed on successful password change.
- Password change via `POST /auth/change-password` requires current password + new password.

## 7. Password Policy

- Minimum 12 characters.
- Must contain at least: 1 uppercase letter, 1 lowercase letter, 1 digit, 1 symbol (from: `!@#$%^&*()_+-=[]{}|;:',.<>?/~\``).
- Validated at: registration, password change, credential reset.
- Stored as bcrypt hash with per-user salt (built into bcrypt).
- Password history: last 5 passwords stored (hashed) to prevent reuse.

**Regex validation (server-side):**
```
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/~`\\]).{12,}$/
```

## 8. RBAC Model

### Roles
| Role | Description |
|---|---|
| `admin` | Full system access. Can manage users, roles, content, offerings, view audit logs, trigger credential resets. |
| `content_manager` | Can create/update/delete content assets, manage categories/tags, trigger parsing. |
| `enrollment_manager` | Can create/manage offerings, approve enrollments, manage waitlists. |
| `learner` | Can browse content, reserve seats, enroll in offerings. |

### Permission Matrix
Permissions are defined per-resource and per-action (create, read, update, delete, special actions). The `RolesGuard` checks the requesting user's roles against the required permission for each endpoint.

### Role Assignment
- Users can have multiple roles.
- Role assignment is admin-only via `POST /admin/users/:id/roles`.
- A `user_roles` join table links users to roles.

## 9. Resource Ownership and Authorization Model

- **Content assets:** Owned by the creating user. Content managers and admins can modify any asset. Learners can only read published assets.
- **Offerings:** Owned by the creating enrollment manager. Admins can modify any offering.
- **Reservations/Enrollments:** Owned by the enrolling user. Enrollment managers can view/approve. Admins see all.
- **Audit events:** Read-only. Admins only.
- **Users:** Self-read for own profile. Admin-only for listing/modifying others.

Authorization is enforced at the guard/interceptor level, not in service logic, to ensure consistent enforcement.

## 10. Content Ingestion and Parsing Pipeline

### Upload Flow
1. `POST /content-assets` with multipart file upload.
2. `FileModule` validates: file type (allowlist), size (<=250MB), filename sanitization, content sniffing (magic bytes).
3. File stored to local filesystem at `/data/files/{asset_id}/{version_uuid}/{sanitized_filename}`.
4. SHA-256 hash computed on raw file bytes, stored in `content_asset_versions.file_hash`.
5. Metadata record created in `content_assets` and `content_asset_versions`.

### Parsing Flow (async, triggered after upload)
1. A background job is enqueued to parse the uploaded file.
2. Parser selection based on detected MIME type:
   - **EPUB:** Uses `epub` npm package to extract chapters, metadata, and text content.
   - **PDF:** Uses `pdf-parse` npm package to extract text by page.
   - **Plain text:** Split by configurable delimiters (double newline for paragraphs).
3. Extracted text is cleaned (normalize whitespace, strip control characters).
4. Chapters/segments stored in `parsed_documents` table linked to the content version.
5. Normalized text hashed (SHA-256) for duplicate detection.

### Dataset Layers (per content version)
| Layer | Table/Storage | Content |
|---|---|---|
| Raw | Local filesystem | Original uploaded binary |
| Cleaned | `parsed_documents` | Extracted and normalized text segments |
| Features | `content_features` | Token counts, language flags, shingle hashes |
| Results | `duplicate_groups`, `content_lineage` | Duplicate detection results, lineage links |

## 11. Versioning Model

- Every content asset has an immutable `id` (UUID).
- Each modification creates a new row in `content_asset_versions`:
  - `id` (UUID, immutable version identifier)
  - `asset_id` (FK to content_assets)
  - `semantic_version` (major.minor.patch string)
  - `parent_version_id` (FK to previous version, nullable for first version)
  - `source_asset_id` (FK, for derived/merged content)
  - `file_hash` (SHA-256)
  - `created_at` (immutable timestamp)
  - `created_by` (FK to users)
  - `is_current` (boolean, only one per asset)
- Semantic version auto-incremented: metadata-only changes bump patch, structural changes bump minor, admin override for major.

## 12. Rollback Model

- `POST /content-assets/:id/rollback` with `{ target_version_id }`.
- Target version must be within 180 days of current date (`created_at >= NOW() - INTERVAL '180 days'`).
- Rollback does NOT delete versions. It creates a new version that copies the target version's content and metadata, with `parent_version_id` pointing to the current version.
- The new version becomes `is_current = true`; the old current version is set to `is_current = false`.
- Rollback is recorded in `audit_events`.

## 13. Enrollment and Reservation State Machine

```
                    ┌──────────┐
        ┌──────────▶│ RELEASED │
        │           └──────────┘
        │ (10 min timeout
        │  or manual cancel)
        │
  ┌─────┴────┐   confirm    ┌───────────┐
  │   HELD   │─────────────▶│ CONFIRMED │
  └─────┬────┘              └─────┬─────┘
        │                         │
        │ (capacity full)         │ cancel
        ▼                         ▼
  ┌───────────┐             ┌───────────┐
  │ WAITLISTED│             │ CANCELED  │
  └─────┬─────┘             └───────────┘
        │
        │ (seat freed + approved)
        ▼
  ┌───────────┐   confirm    ┌───────────┐
  │ APPROVED  │─────────────▶│ CONFIRMED │
  └───────────┘              └───────────┘
```

### States
| State | Description |
|---|---|
| `HELD` | Temporary seat reservation. Auto-releases after 10 minutes. |
| `RELEASED` | Hold expired or manually released. Seat returned to pool. |
| `WAITLISTED` | No seats available. User queued. |
| `APPROVED` | Waitlisted user approved (manually or auto when seat freed). |
| `CONFIRMED` | Enrollment finalized. Seat permanently allocated. |
| `CANCELED` | Enrollment canceled by user or admin. Seat returned. |

### Transition Rules
- `HELD -> CONFIRMED`: User calls confirm within 10 min window.
- `HELD -> RELEASED`: Timeout (scheduled job) or user cancels.
- `HELD -> WAITLISTED`: Attempted when capacity full (immediate transition at create time).
- `WAITLISTED -> APPROVED`: Seat becomes available and user is next in queue (auto or manual).
- `APPROVED -> CONFIRMED`: User confirms within approval window.
- `CONFIRMED -> CANCELED`: User or admin cancels.
- All transitions recorded in `enrollment_state_transitions` with actor, timestamp, reason.

### Duplicate Prevention
- Unique constraint on `(offering_id, user_id)` in `enrollments` table (across non-canceled states).
- Before creating a reservation, check for existing active reservation/enrollment for the same user+offering.

## 14. Idempotency Model

- Idempotency keys are required on `POST` endpoints for: reservation create, enrollment confirm, enrollment cancel.
- Client sends `Idempotency-Key: <UUID>` header.
- Server stores key in `idempotency_keys` table: `key (PK)`, `endpoint`, `user_id`, `response_status`, `response_body`, `created_at`.
- If a duplicate key is received within 24 hours, the stored response is returned without re-executing the operation.
- Keys older than 24 hours are purged by a scheduled job.
- Internal scheduled job callbacks (e.g., seat release) also use idempotency keys to prevent double-processing.

## 15. Duplicate and Near-Duplicate Detection Model

### Exact Duplicate Detection
- SHA-256 hash computed on normalized text (lowercased, whitespace-collapsed, punctuation-stripped).
- Hash stored in `parsed_documents.content_hash`.
- Index on `content_hash` enables O(1) duplicate lookup on insert.
- On duplicate detection: new record is created but flagged as `duplicate_of` referencing the original.

### Near-Duplicate Detection
- Shingle-based similarity: text is broken into w-shingles (w=5 words).
- Each shingle is hashed (SHA-256, truncated to 64 bits for efficiency).
- MinHash signatures computed (128 permutations) for each document.
- Jaccard similarity estimated from MinHash signature overlap.
- Threshold: >= 0.8 similarity flags as near-duplicate.
- Near-duplicate links stored in `duplicate_links` table: `doc_a_id`, `doc_b_id`, `similarity_score`, `detected_at`.
- Detection runs as a background job after parsing completes.

## 16. Canonical Merge Model

- When duplicates or near-duplicates are identified, an admin can designate a canonical record.
- `POST /content-assets/:id/merge` with `{ source_ids: [...], canonical_id }`.
- Merge creates `canonical_links` records: each source points to the canonical.
- Original records are preserved (never deleted), but marked `is_canonical = false`.
- The canonical record's metadata may be enriched from source records.
- All references (enrollments, categories, tags) on source records remain valid; queries can optionally resolve through canonical links.

## 17. Secure File Handling Model

### Upload Validation Pipeline
1. **Extension check:** Must be in allowlist: `.epub`, `.pdf`, `.txt`, `.mp4`, `.mp3`.
2. **MIME type / magic bytes:** Server-side content sniffing using `file-type` npm package. Must match declared extension.
3. **Size check:** <= 250 MB.
4. **Filename sanitization:** Strip path traversal sequences (`../`, `..\\`), null bytes, control characters. Replace spaces with underscores. Truncate to 255 characters. Generate a UUID-prefixed safe name.
5. **Structural validation ("virus scan"):**
   - EPUB: Validate ZIP structure, check for embedded scripts/executables in OPF manifest.
   - PDF: Parse structure, reject if contains `/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFile` with executable extensions.
   - MP4/MP3: Validate container structure headers.
   - TXT: No structural validation needed beyond size.
6. **Rejection logging:** Failed validations logged to `audit_events` with reason, filename, user, trace ID.

### Storage
- Files stored at: `/data/files/{asset_id}/{version_id}/{safe_filename}`.
- Directory permissions: `0750`, files: `0640`.
- No direct filesystem access via API. All access through authenticated download endpoints.

## 18. Tokenized Download Model

- `GET /content-assets/:id/versions/:vid/download-token` returns a signed download token.
- Token structure: `{ asset_id, version_id, user_id, expires_at, signature }`.
- Signature: HMAC-SHA256 of the payload using a server-side secret key (from environment config).
- Token expires in 15 minutes.
- `GET /files/download?token=<base64-encoded-token>` validates signature and expiry, then streams the file.
- Expired or invalid tokens return `401`.
- Token generation requires authentication; download endpoint validates the token itself (no session needed).

## 19. Encryption-at-Rest Strategy

### Scope
Encrypted fields:
- `users.password_hash` — Note: bcrypt hash is already one-way, but encrypted at rest for defense-in-depth.
- `users.reset_token_hash`
- `users.government_id` (optional field)
- `users.employee_id` (optional field)

### Implementation
- AES-256-GCM encryption using Node.js `crypto` module.
- Encryption key stored in environment variable (`ENCRYPTION_KEY`), loaded at startup.
- Key is 32 bytes, hex-encoded in env var.
- Each encrypted field uses a unique IV (12 bytes, randomly generated per encryption).
- Stored format: `{iv}:{authTag}:{ciphertext}` (all base64-encoded).
- TypeORM `ValueTransformer` on entity columns handles transparent encrypt/decrypt.
- Key rotation: new key encrypts new writes; a scheduled migration job re-encrypts existing records.

### Key Management
- Key stored in `.env` file (not committed to repo).
- `.env.example` documents the required variable with a placeholder.
- Docker deployment injects the key via environment variable.

## 20. Response Masking Strategy

- A `MaskingInterceptor` (NestJS interceptor) processes all outgoing responses.
- Masking rules defined per-field:
  - `government_id`: Show last 4 characters, mask rest with `*`.
  - `employee_id`: Show last 4 characters, mask rest with `*`.
  - `password_hash`: Never included in responses.
  - `reset_token_hash`: Never included in responses.
  - `email`: Show first 2 chars + `***` + domain (if email field exists).
- Masking is applied by checking field names against a configurable denylist/mask-rules map.
- Entities use `@Exclude()` decorators (class-transformer) for fields that should never appear.
- The interceptor applies `ClassSerializerInterceptor` behavior plus custom masking logic.

## 21. Audit Model

### AuditEvent Entity
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `trace_id` | UUID | Request trace ID |
| `actor_id` | UUID (FK) | User who performed the action |
| `action` | VARCHAR | Action name (e.g., `content.create`, `enrollment.confirm`) |
| `resource_type` | VARCHAR | Entity type affected |
| `resource_id` | UUID | Entity ID affected |
| `changes` | JSONB | Before/after snapshot of changed fields |
| `reason` | TEXT | Optional reason or context |
| `ip_address` | VARCHAR | Client IP |
| `timestamp` | TIMESTAMPTZ | When the event occurred |
| `metadata` | JSONB | Additional context (idempotency key, job ID, etc.) |

### Recording
- The `AuditInterceptor` captures all write operations (POST, PUT, PATCH, DELETE).
- For state machine transitions (enrollment states), explicit audit records are created in service logic.
- Audit records are immutable (no UPDATE or DELETE allowed on audit_events table).
- Bulk operations create one audit record per affected resource.

## 22. Trace ID Propagation Model

- `TraceIdInterceptor` runs on every request.
- If `X-Trace-Id` header is present, it is used (for client correlation). Otherwise, a UUID v4 is generated.
- Trace ID is stored in `AsyncLocalStorage` (Node.js) for access throughout the request lifecycle.
- All log entries include the trace ID.
- All audit events include the trace ID.
- Background jobs generate their own trace IDs, logged alongside the job ID.
- Response includes `X-Trace-Id` header for client correlation.

## 23. Rate Limiting Model

### Login Rate Limiting
- **Per-IP:** 20 attempts per 10 minutes.
- Tracked in-memory using a sliding window counter (Map with IP key, timestamped attempt array).
- On limit exceeded: `429 Too Many Requests` with `Retry-After` header.

### General API Rate Limiting
- Per-authenticated-user: 200 requests per minute (configurable).
- Implemented using `@nestjs/throttler` with PostgreSQL-backed storage for persistence across restarts.

### Implementation
- `RateLimitGuard` as a NestJS guard.
- Login rate limiting uses in-memory store (acceptable for single-host).
- Counters reset on window expiry.

## 24. Local Proof-of-Work Challenge Model

### Purpose
Replace external CAPTCHA with a local computational challenge to slow automated attacks, particularly on login and registration endpoints.

### Flow
1. Client requests a challenge: `GET /auth/challenge`.
2. Server returns `{ challenge_id, prefix, difficulty, expires_at }`.
   - `prefix`: a random 16-byte hex string.
   - `difficulty`: number of leading zero bits required in hash (default: 20, ~1M hashes for client).
   - `expires_at`: 5 minutes from issuance.
3. Client must find a `nonce` such that `SHA-256(prefix + nonce)` has `difficulty` leading zero bits.
4. Client submits `{ challenge_id, nonce }` alongside the login/register request.
5. Server verifies: challenge exists, not expired, not already used, and hash meets difficulty.
6. Challenge is marked as consumed (single-use).

### Storage
- Challenges stored in `pow_challenges` table: `id`, `prefix`, `difficulty`, `expires_at`, `consumed_at`.
- Expired/consumed challenges purged by scheduled job.

### When Required
- Login attempts after 3 consecutive failures for an account.
- Registration (always).
- Password reset token redemption (always).

## 25. Brute-Force Lockout Model

- Track failed login attempts per account in `login_attempts` table: `user_id`, `ip_address`, `attempted_at`, `success`.
- **Trigger:** 10 failed attempts within 15 minutes for the same account.
- **Action:** Account locked for 30 minutes. `users.locked_until` set to `NOW() + 30 minutes`.
- **During lockout:** All login attempts for that account return `423 Locked` with a generic message (no information leakage about lockout reason).
- **Unlock:** Automatic after 30-minute cooldown. Admin can manually unlock via `POST /admin/users/:id/unlock`.
- **Counter reset:** Successful login resets the failure counter.
- All lockout events recorded in `audit_events`.

## 26. Dataset Layering Model

Content-derived data is organized into four layers, each stored separately and linked by content version ID:

| Layer | Storage | Purpose | Immutable? |
|---|---|---|---|
| **Raw** | Filesystem `/data/files/` | Original uploaded binary | Yes |
| **Cleaned** | `parsed_documents` table | Extracted, normalized text segments | Yes (per version) |
| **Features** | `content_features` table | Token counts, language flags, shingle hashes | Yes (per version) |
| **Results** | `duplicate_groups`, `duplicate_links` tables | Duplicate detection results, lineage | Append-only |

- Each layer is linked to a specific `content_asset_version_id`.
- Layers are computed sequentially: Raw -> Cleaned -> Features -> Results.
- Reprocessing creates new layer records for a new version; old layer data remains for the old version.

## 27. Lineage Model

- Every `content_asset_version` has:
  - `parent_version_id`: The version this was derived from (NULL for initial upload).
  - `source_asset_id`: If this content was derived from another asset (e.g., chapter extracted from a book).
- `content_lineage` table provides additional lineage tracking:
  - `id`, `descendant_version_id`, `ancestor_version_id`, `relationship_type` (e.g., `derived`, `merged`, `rollback`, `extracted`), `created_at`.
- Lineage is queryable: given any version, traverse ancestors or descendants.
- Indexes on `descendant_version_id` and `ancestor_version_id` for efficient traversal.

## 28. Docker Deployment Model

### Containers
1. **app** — NestJS application (Node.js 20 Alpine).
2. **db** — PostgreSQL 15 Alpine.

### docker-compose.yml
- Single `docker-compose.yml` at `repo/` root.
- Persistent volumes for PostgreSQL data and uploaded files.
- Environment variables from `.env` file.
- Health checks on both containers.
- No external network dependencies.

### Dockerfile (app)
- Multi-stage build: build stage (compile TypeScript), production stage (run compiled JS).
- Non-root user for security.
- `/data/files` directory created with appropriate permissions.

### Startup
- TypeORM `synchronize: false` in production. Migrations run on startup via a boot script.
- Application waits for PostgreSQL to be ready before starting (health check dependency).

### Offline Guarantee
- No `npm install` at runtime (all deps baked into image).
- No external URL references in application code.
- Docker images can be pre-built and loaded via `docker load`.
