# API Specification

## General Conventions

- **Base path:** `/api/v1`
- **Content type:** `application/json` (except file uploads: `multipart/form-data`)
- **Authentication:** `Authorization: Bearer <session-token>` header on all protected endpoints
- **Trace ID:** `X-Trace-Id` header on all responses (echo or generated)
- **Idempotency:** `Idempotency-Key` header required on specified endpoints
- **Timestamps:** ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **IDs:** UUID v4 strings

## Standard Error Response Shape

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Human-readable description",
  "details": [
    { "field": "password", "constraint": "minLength", "message": "Must be at least 12 characters" }
  ],
  "traceId": "uuid"
}
```

## Standard Success Envelope

```json
{
  "data": { ... },
  "meta": {
    "traceId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

For paginated lists:
```json
{
  "data": [ ... ],
  "meta": {
    "traceId": "uuid",
    "timestamp": "ISO8601",
    "page": 1,
    "pageSize": 20,
    "totalCount": 142
  }
}
```

---

## Auth Module

### GET /api/v1/auth/challenge
**Purpose:** Request a proof-of-work challenge.
**Auth:** None
**Request:** Empty body
**Response 200:**
```json
{
  "data": {
    "challengeId": "uuid",
    "prefix": "hex-string-16-bytes",
    "difficulty": 20,
    "expiresAt": "ISO8601"
  }
}
```

### POST /api/v1/auth/register
**Purpose:** Register a new user account.
**Auth:** None (requires PoW challenge)
**Request:**
```json
{
  "username": "string (3-255 chars, alphanumeric + underscore)",
  "password": "string (min 12 chars, complexity rules)",
  "displayName": "string (1-255 chars)",
  "challengeId": "uuid",
  "nonce": "string"
}
```
**Validation:**
- `username`: 3-255 chars, `^[a-zA-Z0-9_]+$`, unique
- `password`: min 12 chars, at least 1 upper, 1 lower, 1 digit, 1 symbol
- `displayName`: 1-255 chars
- PoW challenge must be valid and unsolved

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "username": "string",
    "displayName": "string",
    "createdAt": "ISO8601"
  }
}
```
**Errors:** 400 (validation), 409 (username taken), 400 (invalid/expired challenge)

### POST /api/v1/auth/login
**Purpose:** Authenticate and receive session token.
**Auth:** None (may require PoW after 3 failures)
**Request:**
```json
{
  "username": "string",
  "password": "string",
  "challengeId": "uuid (optional, required after 3 failures)",
  "nonce": "string (optional)"
}
```
**Response 200:**
```json
{
  "data": {
    "token": "string",
    "expiresAt": "ISO8601",
    "user": {
      "id": "uuid",
      "username": "string",
      "displayName": "string",
      "roles": ["admin", "learner"]
    }
  }
}
```
**Errors:** 401 (invalid credentials), 423 (account locked), 429 (rate limited), 400 (PoW required/invalid)

### POST /api/v1/auth/logout
**Purpose:** Invalidate current session.
**Auth:** Required
**Response 204:** No content

### POST /api/v1/auth/change-password
**Purpose:** Change own password.
**Auth:** Required
**Request:**
```json
{
  "currentPassword": "string",
  "newPassword": "string (complexity rules)"
}
```
**Validation:**
- `newPassword`: complexity rules, not in last 5 passwords
**Response 204:** No content
**Errors:** 400 (validation, password reuse), 401 (wrong current password)

### POST /api/v1/auth/reset-password
**Purpose:** Redeem a reset token to set new password.
**Auth:** None (requires PoW)
**Request:**
```json
{
  "token": "string",
  "newPassword": "string",
  "challengeId": "uuid",
  "nonce": "string"
}
```
**Response 204:** No content
**Errors:** 400 (invalid/expired token, validation), 400 (PoW invalid)

---

## User Module

### GET /api/v1/users/me
**Auth:** Required
**Response 200:** Current user profile (masked sensitive fields)

### GET /api/v1/users/:id
**Auth:** Admin only
**Response 200:** User profile (masked sensitive fields)

### GET /api/v1/users
**Auth:** Admin only
**Query params:** `page`, `pageSize`, `search`, `role`, `isActive`
**Response 200:** Paginated user list

### PATCH /api/v1/users/me
**Auth:** Required
**Request:**
```json
{
  "displayName": "string (optional)",
  "governmentId": "string (optional)",
  "employeeId": "string (optional)"
}
```
**Response 200:** Updated user profile

---

## Admin Module

### POST /api/v1/admin/users/:id/reset-password
**Auth:** Admin only
**Response 200:**
```json
{
  "data": {
    "resetToken": "string",
    "expiresAt": "ISO8601"
  }
}
```

### POST /api/v1/admin/users/:id/unlock
**Auth:** Admin only
**Response 204:** No content

### POST /api/v1/admin/users/:id/roles
**Auth:** Admin only
**Request:**
```json
{
  "roleIds": ["uuid"]
}
```
**Response 200:** Updated user with roles

### DELETE /api/v1/admin/users/:id/roles/:roleId
**Auth:** Admin only
**Response 204:** No content

---

## Content Asset Module

### POST /api/v1/content-assets
**Purpose:** Upload a new content asset.
**Auth:** Required (content_manager, admin)
**Content-Type:** `multipart/form-data`
**Fields:**
- `file`: Binary file (required, max 250MB, types: epub/pdf/txt/mp4/mp3)
- `title`: string (required)
- `assetType`: string (required, one of: `book`, `chapter`, `media`)
- `author`: string (optional)
- `publisher`: string (optional)
- `effectiveFrom`: date string (optional, MM/DD/YYYY)
- `effectiveTo`: date string (optional, MM/DD/YYYY)
- `categoryIds`: JSON array of UUIDs (optional)
- `tagIds`: JSON array of UUIDs (optional)

**Validation:**
- File type in allowlist (by extension AND magic bytes)
- File size <= 250 MB
- Filename sanitized server-side
- Structural validation (no embedded executables)

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "title": "string",
    "assetType": "book",
    "author": "string",
    "publisher": "string",
    "currentVersion": {
      "id": "uuid",
      "semanticVersion": "1.0.0",
      "fileHash": "sha256-hex",
      "fileSize": 1234567,
      "mimeType": "application/epub+zip",
      "createdAt": "ISO8601"
    },
    "categories": [],
    "tags": [],
    "createdAt": "ISO8601"
  }
}
```
**Errors:** 400 (validation), 413 (file too large), 415 (unsupported type), 422 (structural validation failure)

### GET /api/v1/content-assets
**Auth:** Required
**Query params:** `page`, `pageSize`, `search`, `assetType`, `categoryId`, `tagId`, `author`
**Response 200:** Paginated list of content assets (metadata only, no file content)

### GET /api/v1/content-assets/:id
**Auth:** Required
**Response 200:** Full content asset metadata with current version info

### PUT /api/v1/content-assets/:id
**Purpose:** Upload a new version of an existing asset.
**Auth:** Required (content_manager, admin)
**Content-Type:** `multipart/form-data`
**Fields:** Same as POST, file optional (metadata-only update bumps patch version)
**Response 200:** Updated content asset with new version

### GET /api/v1/content-assets/:id/versions
**Auth:** Required
**Response 200:** List of all versions for the asset

### GET /api/v1/content-assets/:id/versions/:versionId
**Auth:** Required
**Response 200:** Specific version details including parsed document summary

### POST /api/v1/content-assets/:id/rollback
**Auth:** Required (content_manager, admin)
**Request:**
```json
{
  "targetVersionId": "uuid"
}
```
**Validation:**
- Target version must belong to this asset
- Target version `created_at` must be within 180 days
**Response 200:** New version created from rollback target
**Errors:** 400 (version not found, too old), 403

### GET /api/v1/content-assets/:id/versions/:versionId/download-token
**Auth:** Required
**Response 200:**
```json
{
  "data": {
    "downloadToken": "base64-string",
    "expiresAt": "ISO8601"
  }
}
```

### GET /api/v1/files/download
**Auth:** Required session + valid download token bound to authenticated user
**Query params:** `token` (base64-encoded signed token)
**Response 200:** Binary file stream with appropriate Content-Type
**Errors:** 401 (invalid/expired token)

### POST /api/v1/content-assets/:id/merge
**Auth:** Admin only
**Request:**
```json
{
  "sourceIds": ["uuid"],
  "canonicalId": "uuid"
}
```
**Response 200:** Canonical asset with links to sources

### GET /api/v1/content-assets/:id/parsed
**Auth:** Required
**Response 200:** Parsed documents (chapters/segments) for current version

### GET /api/v1/content-assets/:id/duplicates
**Auth:** Required (content_manager, admin)
**Response 200:** List of duplicate/near-duplicate links

### GET /api/v1/content-assets/:id/lineage
**Auth:** Required
**Response 200:** Version lineage tree (ancestors and descendants)

---

## Category Module

### POST /api/v1/categories
**Auth:** Required (content_manager, admin)
**Request:**
```json
{
  "name": "string (1-255 chars)",
  "parentId": "uuid (optional)"
}
```
**Response 201:** Created category with computed path

### GET /api/v1/categories
**Auth:** Required
**Query params:** `parentId` (optional, for subtree), `flat` (boolean, default false for tree)
**Response 200:** Category tree or flat list

### PUT /api/v1/categories/:id
**Auth:** Required (content_manager, admin)
**Response 200:** Updated category

### DELETE /api/v1/categories/:id
**Auth:** Admin only
**Validation:** Must not have child categories or associated assets (or cascade configurable)
**Response 204:** No content

---

## Tag Module

### POST /api/v1/tags
**Auth:** Required (content_manager, admin)
**Request:** `{ "name": "string (1-100 chars)" }`
**Response 201:** Created tag

### GET /api/v1/tags
**Auth:** Required
**Query params:** `search`, `page`, `pageSize`
**Response 200:** Paginated tag list

### DELETE /api/v1/tags/:id
**Auth:** Admin only
**Response 204:** No content

---

## Offering Module

### POST /api/v1/offerings
**Auth:** Required (enrollment_manager, admin)
**Request:**
```json
{
  "title": "string",
  "description": "string (optional)",
  "assetId": "uuid (optional)",
  "seatCapacity": "integer (1-5000)",
  "enrollmentWindowStart": "MM/DD/YYYY HH:mm",
  "enrollmentWindowEnd": "MM/DD/YYYY HH:mm",
  "eligibilityFlags": {
    "employeeOnly": true,
    "departments": ["engineering", "sales"]
  },
  "requiresApproval": false,
  "waitlistEnabled": true
}
```
**Validation:**
- `seatCapacity`: integer, 1-5000
- `enrollmentWindowEnd` must be after `enrollmentWindowStart`
- `enrollmentWindowStart` must be in the future (for new offerings)

**Response 201:** Created offering
**Errors:** 400 (validation)

### GET /api/v1/offerings
**Auth:** Required
**Query params:** `page`, `pageSize`, `status` (open/closed/upcoming), `search`
**Response 200:** Paginated offering list with seat availability

### GET /api/v1/offerings/:id
**Auth:** Required
**Response 200:** Full offering details with seat counts

### PUT /api/v1/offerings/:id
**Auth:** Required (enrollment_manager, admin)
**Response 200:** Updated offering

### GET /api/v1/offerings/:id/enrollments
**Auth:** Required (enrollment_manager, admin)
**Response 200:** List of enrollments for the offering

### GET /api/v1/offerings/:id/waitlist
**Auth:** Required (enrollment_manager, admin)
**Response 200:** Ordered waitlist for the offering

---

## Reservation Module

### POST /api/v1/reservations
**Purpose:** Create a seat hold for an offering.
**Auth:** Required
**Idempotency-Key:** Required
**Request:**
```json
{
  "offeringId": "uuid"
}
```
**Validation:**
- Enrollment window must be open
- User must meet eligibility criteria
- No existing active reservation or enrollment for same user+offering
- Seats must be available (or waitlist if enabled)

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "offeringId": "uuid",
    "status": "HELD",
    "heldAt": "ISO8601",
    "expiresAt": "ISO8601"
  }
}
```
**Errors:** 400 (validation), 409 (duplicate reservation/enrollment), 422 (no seats, no waitlist)

### GET /api/v1/reservations/:id
**Auth:** Required (owner, enrollment_manager, admin)
**Response 200:** Reservation details

### DELETE /api/v1/reservations/:id
**Purpose:** Manually release a held reservation.
**Auth:** Required (owner, admin)
**Idempotency-Key:** Required
**Response 204:** No content

---

## Enrollment Module

### POST /api/v1/enrollments/confirm
**Purpose:** Confirm a held reservation into an enrollment.
**Auth:** Required
**Idempotency-Key:** Required
**Request:**
```json
{
  "reservationId": "uuid"
}
```
**Validation:**
- Reservation must exist and be in `HELD` status
- Reservation must not be expired
- Reservation must belong to requesting user

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "offeringId": "uuid",
    "status": "CONFIRMED",
    "confirmedAt": "ISO8601"
  }
}
```
**Errors:** 400 (validation), 404 (reservation not found), 409 (already enrolled), 410 (reservation expired)

### POST /api/v1/enrollments/:id/cancel
**Purpose:** Cancel an enrollment.
**Auth:** Required (owner, enrollment_manager, admin)
**Idempotency-Key:** Required
**Request:**
```json
{
  "reason": "string (optional)"
}
```
**Response 200:** Updated enrollment with `CANCELED` status

### POST /api/v1/enrollments/:id/approve
**Purpose:** Approve a waitlisted enrollment (for offerings requiring approval).
**Auth:** Required (enrollment_manager, admin)
**Request:**
```json
{
  "reason": "string (optional)"
}
```
**Response 200:** Updated enrollment with `APPROVED` status

### POST /api/v1/enrollments/:id/confirm-approved
**Purpose:** Confirm an approved enrollment and consume a seat.
**Auth:** Required (enrollment_manager, admin)
**Idempotency-Key:** Required
**Response 200:** Updated enrollment with `CONFIRMED` status

### GET /api/v1/enrollments
**Auth:** Required
**Query params:** `offeringId`, `status`, `page`, `pageSize`
**Response 200:** Paginated enrollment list (own enrollments for learners, all for managers)

### GET /api/v1/enrollments/:id
**Auth:** Required (owner, enrollment_manager, admin)
**Response 200:** Full enrollment details with state history

---

## Audit Module

### GET /api/v1/audit-events
**Auth:** Admin only
**Query params:** `page`, `pageSize`, `actorId`, `resourceType`, `resourceId`, `action`, `from`, `to`, `traceId`
**Response 200:** Paginated audit events

### GET /api/v1/audit-events/:id
**Auth:** Admin only
**Response 200:** Full audit event details

---

## Health Module

### GET /api/v1/health
**Auth:** None
**Response 200:**
```json
{
  "status": "ok",
  "database": "connected",
  "fileStorage": "accessible",
  "uptime": 12345
}
```

---

## Validation Rules Summary

| Field | Rules |
|---|---|
| `password` | Min 12 chars, upper + lower + digit + symbol |
| `username` | 3-255 chars, alphanumeric + underscore, unique |
| `seatCapacity` | Integer, 1-5000 |
| `file` | Max 250 MB, type in allowlist, passes structural validation |
| `enrollmentWindowEnd` | After `enrollmentWindowStart` |
| `semanticVersion` | Pattern: `major.minor.patch` (auto-managed) |
| `idempotencyKey` | UUID format, required on create/confirm/cancel |
| All UUIDs | v4 format validation |
| Pagination | `page` >= 1, `pageSize` 1-100, default 20 |
