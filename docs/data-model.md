# Data Model

## Entity Relationship Overview

```
Users ──┬── user_roles ──── Roles
        │
        ├── sessions
        ├── login_attempts
        ├── password_history
        │
        ├── content_assets ──── content_asset_versions ──┬── parsed_documents
        │       │                       │                 ├── content_features
        │       │                       │                 └── content_lineage
        │       ├── asset_categories ───┤
        │       └── asset_tags ─────────┘
        │
        ├── offerings ──┬── reservations
        │               ├── enrollments
        │               └── enrollment_state_transitions
        │
        └── audit_events

Categories (self-referencing tree)
Tags
duplicate_groups ── duplicate_links
canonical_links
idempotency_keys
pow_challenges
```

## Entities

### users
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Immutable identifier |
| username | VARCHAR(255) | UNIQUE, NOT NULL | Login credential |
| password_hash | TEXT | NOT NULL | Encrypted at rest (AES-256-GCM) |
| display_name | VARCHAR(255) | NOT NULL | |
| government_id | TEXT | NULLABLE | Encrypted at rest, masked in responses |
| employee_id | TEXT | NULLABLE | Encrypted at rest, masked in responses |
| locked_until | TIMESTAMPTZ | NULLABLE | Brute-force lockout expiry |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Soft delete |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `idx_users_username` UNIQUE on `username`

### roles
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(50) | UNIQUE, NOT NULL |
| description | TEXT | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Seed data:** `admin`, `content_manager`, `enrollment_manager`, `learner`

### user_roles
| Column | Type | Constraints |
|---|---|---|
| user_id | UUID | FK -> users, PK |
| role_id | UUID | FK -> roles, PK |
| assigned_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| assigned_by | UUID | FK -> users |

### sessions
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK -> users, NOT NULL |
| token | VARCHAR(255) | UNIQUE, NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| ip_address | VARCHAR(45) | NULLABLE |
| user_agent | TEXT | NULLABLE |

**Indexes:**
- `idx_sessions_token` UNIQUE on `token`
- `idx_sessions_user_id` on `user_id`
- `idx_sessions_expires_at` on `expires_at` (for cleanup job)

### password_history
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK -> users, NOT NULL |
| password_hash | TEXT | NOT NULL | Encrypted at rest |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes:**
- `idx_password_history_user_id` on `user_id`

### login_attempts
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK -> users, NULLABLE |
| ip_address | VARCHAR(45) | NOT NULL |
| attempted_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| success | BOOLEAN | NOT NULL |

**Indexes:**
- `idx_login_attempts_user_id_attempted_at` on `(user_id, attempted_at)`
- `idx_login_attempts_ip_attempted_at` on `(ip_address, attempted_at)`

### content_assets
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | Immutable identifier |
| title | VARCHAR(500) | NOT NULL | |
| asset_type | VARCHAR(20) | NOT NULL | `book`, `chapter`, `media` |
| author | VARCHAR(500) | NULLABLE | |
| publisher | VARCHAR(500) | NULLABLE | |
| effective_from | DATE | NULLABLE | |
| effective_to | DATE | NULLABLE | |
| is_canonical | BOOLEAN | NOT NULL, DEFAULT true | False if merged into canonical |
| created_by | UUID | FK -> users, NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

### content_asset_versions
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | Immutable version identifier |
| asset_id | UUID | FK -> content_assets, NOT NULL | |
| semantic_version | VARCHAR(20) | NOT NULL | `major.minor.patch` |
| parent_version_id | UUID | FK -> content_asset_versions, NULLABLE | Previous version |
| source_asset_id | UUID | FK -> content_assets, NULLABLE | For derived content |
| file_path | TEXT | NOT NULL | Relative path in file store |
| file_hash | VARCHAR(64) | NOT NULL | SHA-256 of raw file |
| file_size | BIGINT | NOT NULL | Bytes |
| mime_type | VARCHAR(100) | NOT NULL | |
| is_current | BOOLEAN | NOT NULL, DEFAULT true | |
| created_by | UUID | FK -> users, NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `idx_cav_asset_id_is_current` on `(asset_id, is_current)` WHERE `is_current = true` (partial unique)
- `idx_cav_file_hash` on `file_hash`
- `idx_cav_parent_version_id` on `parent_version_id`
- `idx_cav_source_asset_id` on `source_asset_id`

### parsed_documents
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| version_id | UUID | FK -> content_asset_versions, NOT NULL | |
| chapter_index | INTEGER | NOT NULL | Ordering within asset |
| title | VARCHAR(500) | NULLABLE | Chapter/segment title |
| content_text | TEXT | NOT NULL | Cleaned extracted text |
| content_hash | VARCHAR(64) | NOT NULL | SHA-256 of normalized text |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `idx_pd_version_id` on `version_id`
- `idx_pd_content_hash` on `content_hash`

### content_features
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| version_id | UUID | FK -> content_asset_versions, NOT NULL | |
| document_id | UUID | FK -> parsed_documents, NOT NULL | |
| token_count | INTEGER | NOT NULL | |
| language | VARCHAR(10) | NULLABLE | ISO 639-1 |
| shingle_hashes | JSONB | NOT NULL | Array of MinHash signatures |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `idx_cf_version_id` on `version_id`

### content_lineage
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| descendant_version_id | UUID | FK -> content_asset_versions, NOT NULL |
| ancestor_version_id | UUID | FK -> content_asset_versions, NOT NULL |
| relationship_type | VARCHAR(20) | NOT NULL | `derived`, `merged`, `rollback`, `extracted` |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes:**
- `idx_cl_descendant` on `descendant_version_id`
- `idx_cl_ancestor` on `ancestor_version_id`

### categories
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| name | VARCHAR(255) | NOT NULL | |
| parent_id | UUID | FK -> categories, NULLABLE | Self-referencing tree |
| path | TEXT | NOT NULL | Materialized path, e.g., `/science/physics/quantum` |
| depth | INTEGER | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `idx_categories_path` on `path` (for prefix queries using `LIKE 'path%'`)
- `idx_categories_parent_id` on `parent_id`

### tags
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | UNIQUE, NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

### asset_categories
| Column | Type | Constraints |
|---|---|---|
| asset_id | UUID | FK -> content_assets, PK |
| category_id | UUID | FK -> categories, PK |

### asset_tags
| Column | Type | Constraints |
|---|---|---|
| asset_id | UUID | FK -> content_assets, PK |
| tag_id | UUID | FK -> tags, PK |

### offerings
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| title | VARCHAR(500) | NOT NULL | |
| description | TEXT | NULLABLE | |
| asset_id | UUID | FK -> content_assets, NULLABLE | Associated content |
| seat_capacity | INTEGER | NOT NULL, CHECK(1-5000) | |
| seats_available | INTEGER | NOT NULL | Denormalized counter |
| enrollment_window_start | TIMESTAMPTZ | NOT NULL | |
| enrollment_window_end | TIMESTAMPTZ | NOT NULL | |
| eligibility_flags | JSONB | NOT NULL, DEFAULT '{}' | e.g., `{"employee_only": true, "departments": ["eng"]}` |
| requires_approval | BOOLEAN | NOT NULL, DEFAULT false | |
| waitlist_enabled | BOOLEAN | NOT NULL, DEFAULT true | |
| created_by | UUID | FK -> users, NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `idx_offerings_enrollment_window` on `(enrollment_window_start, enrollment_window_end)`

### reservations
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| offering_id | UUID | FK -> offerings, NOT NULL | |
| user_id | UUID | FK -> users, NOT NULL | |
| status | VARCHAR(20) | NOT NULL | `HELD`, `RELEASED`, `CONVERTED` |
| held_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| expires_at | TIMESTAMPTZ | NOT NULL | `held_at + 10 minutes` |
| released_at | TIMESTAMPTZ | NULLABLE | |
| idempotency_key | VARCHAR(255) | UNIQUE, NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `idx_reservations_offering_user` on `(offering_id, user_id)` WHERE `status = 'HELD'`
- `idx_reservations_expires_at` on `expires_at` WHERE `status = 'HELD'` (for cleanup job)

### enrollments
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| offering_id | UUID | FK -> offerings, NOT NULL | |
| user_id | UUID | FK -> users, NOT NULL | |
| reservation_id | UUID | FK -> reservations, NULLABLE | |
| status | VARCHAR(20) | NOT NULL | `WAITLISTED`, `APPROVED`, `CONFIRMED`, `CANCELED` |
| waitlisted_at | TIMESTAMPTZ | NULLABLE | |
| approved_at | TIMESTAMPTZ | NULLABLE | |
| confirmed_at | TIMESTAMPTZ | NULLABLE | |
| canceled_at | TIMESTAMPTZ | NULLABLE | |
| cancel_reason | TEXT | NULLABLE | |
| idempotency_key | VARCHAR(255) | UNIQUE, NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `idx_enrollments_offering_user` UNIQUE on `(offering_id, user_id)` WHERE `status != 'CANCELED'`
- `idx_enrollments_offering_status` on `(offering_id, status)` (for waitlist queries)

### enrollment_state_transitions
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| enrollment_id | UUID | FK -> enrollments, NULLABLE |
| reservation_id | UUID | FK -> reservations, NULLABLE |
| from_state | VARCHAR(20) | NOT NULL |
| to_state | VARCHAR(20) | NOT NULL |
| actor_id | UUID | FK -> users, NOT NULL |
| reason | TEXT | NULLABLE |
| trace_id | UUID | NOT NULL |
| timestamp | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes:**
- `idx_est_enrollment_id` on `enrollment_id`
- `idx_est_reservation_id` on `reservation_id`

### audit_events
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| trace_id | UUID | NOT NULL |
| actor_id | UUID | FK -> users, NULLABLE |
| action | VARCHAR(100) | NOT NULL |
| resource_type | VARCHAR(100) | NOT NULL |
| resource_id | UUID | NULLABLE |
| changes | JSONB | NULLABLE |
| reason | TEXT | NULLABLE |
| ip_address | VARCHAR(45) | NULLABLE |
| timestamp | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| metadata | JSONB | NULLABLE |

**Indexes:**
- `idx_ae_trace_id` on `trace_id`
- `idx_ae_actor_id` on `actor_id`
- `idx_ae_resource` on `(resource_type, resource_id)`
- `idx_ae_timestamp` on `timestamp`

### idempotency_keys
| Column | Type | Constraints |
|---|---|---|
| key | VARCHAR(255) | PK |
| endpoint | VARCHAR(255) | NOT NULL |
| user_id | UUID | FK -> users, NOT NULL |
| response_status | INTEGER | NOT NULL |
| response_body | JSONB | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes:**
- `idx_ik_created_at` on `created_at` (for purge job)

### pow_challenges
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| prefix | VARCHAR(32) | NOT NULL |
| difficulty | INTEGER | NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| consumed_at | TIMESTAMPTZ | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes:**
- `idx_pow_expires_at` on `expires_at` (for purge job)

### duplicate_groups
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| canonical_document_id | UUID | FK -> parsed_documents, NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

### duplicate_links
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| group_id | UUID | FK -> duplicate_groups, NULLABLE | For exact duplicates |
| doc_a_id | UUID | FK -> parsed_documents, NOT NULL | |
| doc_b_id | UUID | FK -> parsed_documents, NOT NULL | |
| similarity_score | DECIMAL(5,4) | NOT NULL | 1.0 = exact, <1.0 = near |
| detected_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
- `idx_dl_doc_a` on `doc_a_id`
- `idx_dl_doc_b` on `doc_b_id`

### canonical_links
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| source_asset_id | UUID | FK -> content_assets, NOT NULL |
| canonical_asset_id | UUID | FK -> content_assets, NOT NULL |
| merged_by | UUID | FK -> users, NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Indexes:**
- `idx_canonical_source` UNIQUE on `source_asset_id`
- `idx_canonical_target` on `canonical_asset_id`

## Uniqueness Constraints Summary

| Constraint | Table | Columns | Condition |
|---|---|---|---|
| Username uniqueness | users | `username` | - |
| Active enrollment per user per offering | enrollments | `(offering_id, user_id)` | `WHERE status != 'CANCELED'` |
| Active hold per user per offering | reservations | `(offering_id, user_id)` | `WHERE status = 'HELD'` |
| One current version per asset | content_asset_versions | `(asset_id)` | `WHERE is_current = true` |
| Tag name uniqueness | tags | `name` | - |
| Session token uniqueness | sessions | `token` | - |
| Idempotency key uniqueness | idempotency_keys | `key` | - |
| Canonical link uniqueness | canonical_links | `source_asset_id` | - |

## Immutable Identifiers

All primary keys are UUIDs generated at creation time and never modified. The following are specifically designated as immutable version identifiers:
- `content_asset_versions.id` — content version UUID
- `audit_events.id` — audit record UUID
- `enrollment_state_transitions.id` — state transition UUID
