# Meridian Learning Content & Enrollment Management System

## Implementation Summary

A self-contained, offline-capable backend API for managing digital learning content (EPUB, PDF, TXT, MP4, MP3) and controlling enrollment into limited-seat learning offerings. Built as a single-machine backend with NestJS, TypeORM, and PostgreSQL.

**Key capabilities:**
- Content asset management with semantic versioning and 180-day rollback
- Content parsing (EPUB/PDF/TXT) into chapters and searchable segments
- Duplicate and near-duplicate detection (SHA-256 + MinHash shingle overlap)
- Enrollment lifecycle with lock-then-confirm flow and automatic seat management
- Idempotency-key-protected write operations with 24-hour deduplication
- AES-256-GCM encryption at rest for sensitive fields
- Complete audit trail with trace ID propagation
- Rate limiting, brute-force lockout, and proof-of-work challenge mechanism

## Architecture

```
┌────────────────────────────────────────────────┐
│                Docker Host                      │
│  ┌──────────────┐    ┌──────────────┐          │
│  │  NestJS API  │───▶│  PostgreSQL  │          │
│  │  (Node 20)   │    │    (v15)     │          │
│  └──────┬───────┘    └──────────────┘          │
│         │                                       │
│  ┌──────▼────────┐   ┌──────────────┐          │
│  │  @nestjs/     │   │  Local File  │          │
│  │  schedule     │   │  Storage     │          │
│  └───────────────┘   └──────────────┘          │
└────────────────────────────────────────────────┘
```

**18 NestJS modules:** Auth, Users, Roles, Content, ParsedDocuments, Categories, Tags, Offerings, Reservations, Enrollments, Audit, Idempotency, Files, DuplicateDetection, Encryption, Jobs, Health, Config.

## Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | NestJS 10 |
| ORM | TypeORM 0.3 |
| Database | PostgreSQL 15 |
| Deployment | Docker Compose |
| Testing | Jest + ts-jest |

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env: set real values for ENCRYPTION_KEY, DOWNLOAD_TOKEN_SECRET, DB_PASSWORD

# 2. Start services
docker compose up --build -d

# 3. Verify
curl http://localhost:3000/api/v1/health
```

## Configuration

All configuration via environment variables (see `.env.example`):

| Variable | Description | Required |
|---|---|---|
| `DB_USERNAME` | PostgreSQL username | Yes |
| `DB_PASSWORD` | PostgreSQL password | Yes |
| `DB_NAME` | Database name | Yes |
| `ENCRYPTION_KEY` | AES-256 key (64 hex chars) | Yes |
| `DOWNLOAD_TOKEN_SECRET` | HMAC signing key (64 hex chars) | Yes |
| `SESSION_TTL_HOURS` | Session lifetime (default: 8) | No |
| `POW_DIFFICULTY` | Proof-of-work bits (default: 20) | No |

## Docker Deployment

```bash
docker compose up --build -d    # Start
docker compose logs -f app      # View logs
docker compose down              # Stop
```

- **Fully offline:** No outbound network calls. All deps baked into Docker image.
- **Persistent volumes:** `pg_data` for database, `file_storage` for uploaded files.
- **Health check:** Both app and db containers have health checks.
- **Non-root user:** App runs as `appuser` inside container.

## Offline Assumptions

- No external APIs, cloud services, CDN, SaaS queues, or third-party antivirus.
- All content parsing performed locally (pdf-parse, built-in EPUB extraction).
- File storage on local filesystem (`/data/files/`).
- CAPTCHA replaced with local proof-of-work challenge (SHA-256 prefix puzzle).
- Virus scanning limited to structural validation (no external AV).

## Testing

`run_tests.sh` runs **unit and API tests inside Docker** (`NODE_TEST_IMAGE`, default `node:20-bookworm-slim`) so Jest always uses a pinned Node version. API tests spin up a temporary PostgreSQL container; Jest reaches it via `host.docker.internal`. **Docker is required.**

```bash
# Full suite (unit + API) — recommended
./run_tests.sh

# Optional: skip API or unit only
RUN_API_TESTS=false ./run_tests.sh
RUN_UNIT_TESTS=false ./run_tests.sh
```

To match submission/CI, prefer the script above. For quick debugging only, after `npm ci` you can run `npx jest --config jest.unit.config.js` or `npx jest --config jest.api.config.js --runInBand` on the host, but Node version drift may differ from Docker.

## Scheduled Jobs

All jobs run in-process via `@nestjs/schedule`:

| Job | Schedule | Purpose |
|---|---|---|
| ReservationExpiry | Every 1 min | Release expired HELD reservations |
| WaitlistPromotion | Every 5 min | Promote waitlisted users when seats free |
| ContentParsing | Every 5 min | Parse uploaded EPUB/PDF/TXT |
| SessionCleanup | Hourly | Delete expired sessions |
| LoginAttemptCleanup | Hourly | Delete old login attempts |
| PowChallengePurge | Hourly | Delete expired PoW challenges |
| IdempotencyKeyPurge | Every 6 hours | Delete expired idempotency keys |

Jobs use pessimistic row locking (`SELECT FOR UPDATE`) and idempotency keys to prevent double-processing.

## Security Notes

- **Passwords:** bcrypt with cost factor 12, min 12 chars with complexity rules
- **Encryption:** AES-256-GCM with random IV per field, two-key rotation support
- **Sessions:** Opaque UUID tokens in PostgreSQL, configurable TTL
- **Rate limiting:** 20 login attempts per IP per 10 minutes (sliding window)
- **Lockout:** 10 failed logins in 15 minutes triggers 30-minute lockout
- **File validation:** Extension allowlist + magic byte verification + structural validation
- **Download tokens:** HMAC-SHA256 signed, 15-minute expiry
- **Response masking:** Sensitive fields (governmentId, employeeId) masked to last 4; password hashes never returned
- **Audit trail:** All write operations logged with trace ID, actor, timestamp

## Known Limitations

1. **EPUB parsing is basic** — XML text extraction, not a full EPUB3-compliant parser
2. **Near-duplicate detection is O(n)** — linear scan against all documents; LSH banding would improve scale
3. **No TypeORM migrations generated** — uses `synchronize: true` in dev; production needs generated migrations
4. **Field-level encryption not wired as column transformers** — EncryptionService exists and is tested; manual application-level encryption

## Manual Verification Required

| Item | Reason |
|---|---|
| p95 < 300ms under 200 concurrent requests | Requires load testing (k6/artillery) |
| Actual concurrent seat reservation race | Pessimistic locking is correct; needs multi-thread stress test |
| Real EPUB/PDF parsing quality | Parser produces output; content quality depends on source files |
| Docker container startup and health | Requires `docker compose up` execution |
| PostgreSQL migration execution | Requires running database |
| Background job timing accuracy | Cron schedule registered; actual timing is runtime |
