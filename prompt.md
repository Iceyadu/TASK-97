# Original Prompt

A Meridian Learning Content & Enrollment Management system that includes offline-first cataloging of digital learning materials and controlled enrollment into limited-seat offerings, delivered as a single-machine backend API using NestJS to expose resource-based interfaces, TypeORM for persistence mapping, and PostgreSQL for transactional storage.

## Core Resources

Users, Roles, ContentAssets (book, chapter, media), ParsedDocuments, Categories, Tags, Offerings (a scheduled learning instance), Reservations (temporary seat holds), Enrollments, and AuditEvents.

## Authentication

- Local username + password only
- Session issuance
- Password change
- Admin-driven credential resets
- Passwords: min 12 characters, upper + lower + number + symbol
- Stored using salted hashing

## Content Assets

- Authenticated upload/import
- Parsing of EPUB, PDF, and plain text into structured chapters and searchable text segments
- Metadata: author, publisher, tags, categories, effective dates
- Each update creates a new content version
- Rollback to any prior version within 180 days

## Enrollment

- Offering: seat capacity 1-5000, enrollment window (MM/DD/YYYY date-time range), eligibility flags, optional manual approval, waitlist behavior
- Lock-then-confirm flow: seat hold lasts 10 minutes, auto-releases
- Confirmation converts hold into enrollment
- Duplicate enrollment attempts rejected (same user + offering)
- State transitions: hold, release, waitlisted, approved, confirmed, canceled
- All transitions recorded with actor, timestamp, reason
- Idempotency keys required for create/confirm/cancel; deduplicate retries for 24 hours

## Data Storage

- Layered datasets: raw binaries, cleaned text, feature tables, result tables
- Immutable version identifiers (UUID), semantic versions (major.minor.patch)
- Lineage links (parent_version_id, source_asset_id)
- Indexes on offering_id+user_id uniqueness, content hash, category path
- Duplicate detection: SHA-256 on normalized text and file fingerprints
- Near-duplicates: shingle overlap computed locally
- Merges preserve originals, designate canonical, create link relations

## Secure File Handling

- Type allowlist: EPUB/PDF/TXT/MP4/MP3
- Max size: 250 MB per file
- Filename sanitization, server-side content sniffing
- Authenticated download with expiring tokens (15 minutes)
- Basic structural validation (blocked embedded executables), rejections logged

## Encryption & Masking

- AES-256 at rest with local key for sensitive fields
- Masking in responses (e.g., last 4 only)

## Non-Functional

- Fully offline Docker on single host
- Complete audit logs with trace IDs
- Point-in-time rollback of dataset versions
- p95 < 300 ms for typical queries under 200 concurrent requests
- Rate limiting: 20 login attempts per IP per 10 minutes
- Local proof-of-work puzzles (CAPTCHA replacement)
- Brute-force lockout: 10 failed logins in 15 minutes, 30-minute cooldown
