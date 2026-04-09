# Route Inventory

## Overview

All routes are prefixed with `/api/v1`. Authentication is required unless noted otherwise.

## Auth Module

| Method | Path | Auth | Idempotency | Description |
|---|---|---|---|---|
| GET | /auth/challenge | None | No | Request proof-of-work challenge |
| POST | /auth/register | None (PoW) | No | Register new user |
| POST | /auth/login | None (PoW conditional) | No | Authenticate, receive session |
| POST | /auth/logout | Required | No | Invalidate session |
| POST | /auth/change-password | Required | No | Change own password |
| POST | /auth/reset-password | None (PoW) | No | Redeem reset token |

**Total: 6 routes**

## User Module

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /users/me | Required | Own profile |
| PATCH | /users/me | Required | Update own profile |
| GET | /users/:id | Admin | View user |
| GET | /users | Admin | List users (paginated) |

**Total: 4 routes**

## Admin Module

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /admin/users/:id/reset-password | Admin | Generate reset token |
| POST | /admin/users/:id/unlock | Admin | Unlock locked account |
| POST | /admin/users/:id/roles | Admin | Assign roles |
| DELETE | /admin/users/:id/roles/:roleId | Admin | Remove role |

**Total: 4 routes**

## Content Asset Module

| Method | Path | Auth | Idempotency | Description |
|---|---|---|---|---|
| POST | /content-assets | CM/Admin | No | Upload new asset |
| GET | /content-assets | Required | No | List assets (paginated) |
| GET | /content-assets/:id | Required | No | Get asset details |
| PUT | /content-assets/:id | CM/Admin | No | Update / upload new version |
| GET | /content-assets/:id/versions | Required | No | List versions |
| GET | /content-assets/:id/versions/:vid | Required | No | Get version details |
| POST | /content-assets/:id/rollback | CM/Admin | No | Rollback to prior version |
| GET | /content-assets/:id/versions/:vid/download-token | Required | No | Get download token |
| POST | /content-assets/:id/merge | Admin | No | Merge duplicates |
| GET | /content-assets/:id/parsed | Required | No | Get parsed documents |
| GET | /content-assets/:id/duplicates | CM/Admin | No | Get duplicate links |
| GET | /content-assets/:id/lineage | Required | No | Get version lineage |

**Total: 12 routes**

## File Module

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /files/download | Required | Download file with signed token |

**Total: 1 route**

## Category Module

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /categories | CM/Admin | Create category |
| GET | /categories | Required | List/tree categories |
| PUT | /categories/:id | CM/Admin | Update category |
| DELETE | /categories/:id | Admin | Delete category |

**Total: 4 routes**

## Tag Module

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /tags | CM/Admin | Create tag |
| GET | /tags | Required | List tags (paginated) |
| DELETE | /tags/:id | Admin | Delete tag |

**Total: 3 routes**

## Offering Module

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /offerings | EM/Admin | Create offering |
| GET | /offerings | Required | List offerings (paginated) |
| GET | /offerings/:id | Required | Get offering details |
| PUT | /offerings/:id | EM/Admin | Update offering |
| GET | /offerings/:id/enrollments | EM/Admin | List enrollments for offering |
| GET | /offerings/:id/waitlist | EM/Admin | View waitlist |

**Total: 6 routes**

## Reservation Module

| Method | Path | Auth | Idempotency | Description |
|---|---|---|---|---|
| POST | /reservations | Required | **Required** | Create seat hold |
| GET | /reservations/:id | Owner/EM/Admin | No | Get reservation |
| DELETE | /reservations/:id | Owner/Admin | **Required** | Release reservation |

**Total: 3 routes**

## Enrollment Module

| Method | Path | Auth | Idempotency | Description |
|---|---|---|---|---|
| POST | /enrollments/confirm | Required | **Required** | Confirm reservation |
| POST | /enrollments/:id/cancel | Owner/EM/Admin | **Required** | Cancel enrollment |
| POST | /enrollments/:id/approve | EM/Admin | No | Approve waitlisted |
| POST | /enrollments/:id/confirm-approved | EM/Admin | **Required** | Confirm approved enrollment |
| GET | /enrollments | Required | No | List enrollments |
| GET | /enrollments/:id | Owner/EM/Admin | No | Get enrollment details |

**Total: 6 routes**

## Audit Module

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /audit-events | Admin | List audit events (paginated) |
| GET | /audit-events/:id | Admin | Get audit event details |

**Total: 2 routes**

## Health Module

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | None | System health check |

**Total: 1 route**

---

## Summary

| Module | Route Count |
|---|---|
| Auth | 6 |
| User | 4 |
| Admin | 4 |
| Content Asset | 12 |
| File | 1 |
| Category | 4 |
| Tag | 3 |
| Offering | 6 |
| Reservation | 3 |
| Enrollment | 5 |
| Audit | 2 |
| Health | 1 |
| **Total** | **52** |

## Roles Legend

- **CM** = content_manager
- **EM** = enrollment_manager
- **Admin** = admin
- **Owner** = resource owner
- **Required** = any authenticated user
