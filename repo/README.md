# Meridian Learning Content & Enrollment Management System

Project type: **backend** (API server; `metadata.json` uses `server`)

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

Run these from **`repo/`** (this directory):

```bash
# 1. Configure environment
cp src/.env.example src/.env
# Edit src/.env: set real values for ENCRYPTION_KEY, DOWNLOAD_TOKEN_SECRET, DB_PASSWORD

# 2. Start services
docker compose up --build -d
# Strict-compat startup command
docker-compose up

# 3. Verify
curl http://localhost:3000/api/v1/health
```

## Configuration

All configuration via environment variables (see `src/.env.example`):

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

- **Build:** `Dockerfile` and `docker-compose.yml` live in **`repo/`**; build context is `.` and copies `src/` into the image (see `.dockerignore`).
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

## Repository layout

| Path | Purpose |
|---|---|
| `src/` | NestJS app + Node metadata (`package.json`, `tsconfig*`, Jest configs, `.env.example`, …) |
| `unit_tests/` | Jest unit tests |
| `API_tests/` | Jest API / e2e tests |
| `Dockerfile` | Production image (context = `repo/`) |
| `docker-compose.yml` | Compose stack (this folder) |
| `run_tests.sh` | Docker-based test runner |

**Generated artifacts** (gitignored): `src/node_modules/`, `src/dist/`, `coverage/`. From `src/`: `npm run clean`. Prefer `./run_tests.sh` for validation (see Testing).

## Testing

`run_tests.sh` runs **unit and API tests inside Docker** (`NODE_TEST_IMAGE`, default `node:20-bookworm-slim`). It bind-mounts **`repo/`** so `unit_tests/` and `API_tests/` are visible; `npm` runs from `src/`. API tests attach PostgreSQL and Jest to the **same Docker network** so the app connects by DB container name (reliable on Linux CI). **Docker is required.**

```bash
# From repo/ (this directory)
./run_tests.sh

RUN_API_TESTS=false ./run_tests.sh
RUN_UNIT_TESTS=false ./run_tests.sh
```

Do not rely on host-side `npm install` for submission validation.

## Access

- Base URL: `http://localhost:3000`
- API prefix: `/api/v1`
- Health URL: `http://localhost:3000/api/v1/health`
- Auth header format: `Authorization: Bearer <session-token>`

## Demo Credentials and Roles

Authentication is required.

Provision demo users with `POST /api/v1/auth/register` (PoW challenge required), then assign roles via `POST /api/v1/admin/users/:id/roles`.

| Role | Username | Password |
|---|---|---|
| `admin` | `demo_admin` | `P@ssw0rd!Strong123` |
| `content_manager` | `demo_content_manager` | `P@ssw0rd!Strong123` |
| `enrollment_manager` | `demo_enrollment_manager` | `P@ssw0rd!Strong123` |
| `learner` | `demo_learner` | `P@ssw0rd!Strong123` |

If these users are not pre-seeded in your environment, create them before validation and assign the listed roles.

## Verification Flows

```bash
curl http://localhost:3000/api/v1/health
# Auth: GET /api/v1/auth/challenge → register/login for Bearer token
# Business sample: categories → offerings → reservations → enrollments/confirm
```

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

## Security Notes

- **Passwords:** bcrypt (cost 12), min 12 chars with complexity rules
- **Encryption:** AES-256-GCM; two-key rotation support
- **Sessions:** Opaque UUID tokens in PostgreSQL
- **Rate limiting:** 20 login attempts per IP per 10 minutes
- **Lockout:** 10 failed logins in 15 minutes → 30-minute lockout
- **Download tokens:** HMAC-SHA256, 15-minute expiry
- **Response masking:** Sensitive fields masked; password hashes never returned
- **Audit trail:** Writes logged with trace ID, actor, timestamp

## Known Limitations

1. **EPUB parsing is basic** — XML text extraction, not full EPUB3
2. **Near-duplicate detection is O(n)** — linear scan; LSH would improve scale
3. **No generated migrations in repo** — `synchronize` in dev; production needs migrations
4. **Field-level encryption** — service exists; application-level wiring varies by field

## Manual Verification Required

| Item | Reason |
|---|---|
| p95 under 300ms under load | Requires load testing |
| Concurrent seat races | Needs stress tests beyond unit/API |
| Real parsing quality | Depends on source files |
| Migration execution | Requires live DB |
