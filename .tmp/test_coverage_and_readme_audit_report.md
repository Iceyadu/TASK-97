# Unified Test Coverage + README Audit (Strict Mode)

Date: 2026-04-17  
Verification mode: **STATIC ONLY** (no runtime execution assumed)

Project type declaration in README top: **present** (`backend`) in `repo/README.md`.

---

## 1) Test Coverage Audit

### Backend Endpoint Inventory

Resolved from `repo/src/main.ts` (`api/v1`) + all `repo/src/*/*.controller.ts`.

Total endpoints: **52**

1. `GET /api/v1/health`
2. `GET /api/v1/auth/challenge`
3. `POST /api/v1/auth/register`
4. `POST /api/v1/auth/login`
5. `POST /api/v1/auth/logout`
6. `POST /api/v1/auth/change-password`
7. `POST /api/v1/auth/reset-password`
8. `GET /api/v1/users/me`
9. `PATCH /api/v1/users/me`
10. `GET /api/v1/users`
11. `GET /api/v1/users/:id`
12. `POST /api/v1/admin/users/:id/reset-password`
13. `POST /api/v1/admin/users/:id/unlock`
14. `POST /api/v1/admin/users/:id/roles`
15. `DELETE /api/v1/admin/users/:id/roles/:roleId`
16. `POST /api/v1/content-assets`
17. `GET /api/v1/content-assets`
18. `GET /api/v1/content-assets/:id`
19. `PUT /api/v1/content-assets/:id`
20. `GET /api/v1/content-assets/:id/versions`
21. `GET /api/v1/content-assets/:id/versions/:versionId`
22. `POST /api/v1/content-assets/:id/rollback`
23. `GET /api/v1/content-assets/:id/versions/:versionId/download-token`
24. `GET /api/v1/content-assets/:id/lineage`
25. `POST /api/v1/content-assets/:id/merge`
26. `GET /api/v1/content-assets/:id/parsed`
27. `GET /api/v1/content-assets/:id/duplicates`
28. `GET /api/v1/files/download`
29. `POST /api/v1/reservations`
30. `GET /api/v1/reservations/:id`
31. `DELETE /api/v1/reservations/:id`
32. `POST /api/v1/enrollments/confirm`
33. `POST /api/v1/enrollments/:id/cancel`
34. `POST /api/v1/enrollments/:id/approve`
35. `POST /api/v1/enrollments/:id/confirm-approved`
36. `GET /api/v1/enrollments`
37. `GET /api/v1/enrollments/:id`
38. `POST /api/v1/offerings`
39. `GET /api/v1/offerings`
40. `GET /api/v1/offerings/:id`
41. `GET /api/v1/offerings/:id/enrollments`
42. `GET /api/v1/offerings/:id/waitlist`
43. `PUT /api/v1/offerings/:id`
44. `POST /api/v1/categories`
45. `GET /api/v1/categories`
46. `PUT /api/v1/categories/:id`
47. `DELETE /api/v1/categories/:id`
48. `POST /api/v1/tags`
49. `GET /api/v1/tags`
50. `DELETE /api/v1/tags/:id`
51. `GET /api/v1/audit-events`
52. `GET /api/v1/audit-events/:id`

### API Test Mapping Table

Legend:
- test type: `true no-mock HTTP` / `HTTP with mocking` / `unit-only/indirect`
- `covered = yes` means exact method+path request exists in API tests.

| Endpoint | Covered | Test type | Test files | Evidence |
|---|---|---|---|---|
| GET `/api/v1/health` | yes | true no-mock HTTP | `API_tests/health.api.spec.ts` | `it('GET /api/v1/health...')` |
| GET `/api/v1/auth/challenge` | yes | true no-mock HTTP | `API_tests/auth-challenge.api.spec.ts`, `API_tests/helpers/pow.ts`, `API_tests/coverage-expansion.api.spec.ts` | `.get('/api/v1/auth/challenge')` |
| POST `/api/v1/auth/register` | yes | true no-mock HTTP | `API_tests/auth.api.spec.ts`, `API_tests/helpers/pow.ts` | register flow |
| POST `/api/v1/auth/login` | yes | true no-mock HTTP | `API_tests/auth.api.spec.ts` (+others) | `.post('/api/v1/auth/login')` |
| POST `/api/v1/auth/logout` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | `auth('post','/api/v1/auth/logout',...)` |
| POST `/api/v1/auth/change-password` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | `auth('post','/api/v1/auth/change-password',...)` |
| POST `/api/v1/auth/reset-password` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | `.post('/api/v1/auth/reset-password')` |
| GET `/api/v1/users/me` | yes | unit-only/indirect | `API_tests/auth.api.spec.ts` | unauthenticated 401 check |
| PATCH `/api/v1/users/me` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | `auth('patch','/api/v1/users/me',...)` |
| GET `/api/v1/users` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | `auth('get','/api/v1/users?page=...')` |
| GET `/api/v1/users/:id` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | `auth('get',\`/api/v1/users/${id}\`)` |
| POST `/api/v1/admin/users/:id/reset-password` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | admin reset call |
| POST `/api/v1/admin/users/:id/unlock` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | admin unlock call |
| POST `/api/v1/admin/users/:id/roles` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | admin assign roles |
| DELETE `/api/v1/admin/users/:id/roles/:roleId` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | admin remove role |
| POST `/api/v1/content-assets` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | multipart `.post('/api/v1/content-assets')` |
| GET `/api/v1/content-assets` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | list route call |
| GET `/api/v1/content-assets/:id` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | detail route call |
| PUT `/api/v1/content-assets/:id` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | update route call |
| GET `/api/v1/content-assets/:id/versions` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | versions route call |
| GET `/api/v1/content-assets/:id/versions/:versionId` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | version detail route |
| POST `/api/v1/content-assets/:id/rollback` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | rollback route call |
| GET `/api/v1/content-assets/:id/versions/:versionId/download-token` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | token route call |
| GET `/api/v1/content-assets/:id/lineage` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | lineage route call |
| POST `/api/v1/content-assets/:id/merge` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | merge route call |
| GET `/api/v1/content-assets/:id/parsed` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | parsed route call |
| GET `/api/v1/content-assets/:id/duplicates` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | duplicates route call |
| GET `/api/v1/files/download` | yes | true no-mock HTTP | `API_tests/download.api.spec.ts`, `API_tests/auth.api.spec.ts` | direct route checks |
| POST `/api/v1/reservations` | yes | true no-mock HTTP | `API_tests/reservation-enrollment.api.spec.ts`, `API_tests/coverage-expansion.api.spec.ts` | direct create calls |
| GET `/api/v1/reservations/:id` | yes | true no-mock HTTP | `API_tests/reservation-enrollment.api.spec.ts`, `API_tests/coverage-expansion.api.spec.ts` | direct id route calls |
| DELETE `/api/v1/reservations/:id` | yes | true no-mock HTTP | `API_tests/reservation-enrollment.api.spec.ts` | delete route call |
| POST `/api/v1/enrollments/confirm` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | confirm route calls |
| POST `/api/v1/enrollments/:id/cancel` | yes | true no-mock HTTP | `API_tests/reservation-enrollment.api.spec.ts` | cancel route call |
| POST `/api/v1/enrollments/:id/approve` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | approve route call |
| POST `/api/v1/enrollments/:id/confirm-approved` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | confirm-approved route call |
| GET `/api/v1/enrollments` | yes | unit-only/indirect | `API_tests/auth.api.spec.ts` | unauthenticated 401 check |
| GET `/api/v1/enrollments/:id` | yes | true no-mock HTTP | `API_tests/reservation-enrollment.api.spec.ts` | id route call |
| POST `/api/v1/offerings` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | create offering |
| GET `/api/v1/offerings` | yes | true no-mock HTTP | `API_tests/offerings-list.api.spec.ts` | list/filter checks |
| GET `/api/v1/offerings/:id` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | detail route |
| GET `/api/v1/offerings/:id/enrollments` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | enrollments route |
| GET `/api/v1/offerings/:id/waitlist` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | waitlist route |
| PUT `/api/v1/offerings/:id` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | update route |
| POST `/api/v1/categories` | yes | true no-mock HTTP | `API_tests/categories.api.spec.ts` | post category (forbidden path tested) |
| GET `/api/v1/categories` | yes | true no-mock HTTP | `API_tests/categories.api.spec.ts` | list route |
| PUT `/api/v1/categories/:id` | no | none | — | no exact PUT request found |
| DELETE `/api/v1/categories/:id` | no | none | — | no exact DELETE request found |
| POST `/api/v1/tags` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | create tag |
| GET `/api/v1/tags` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | list tags |
| DELETE `/api/v1/tags/:id` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | delete tag |
| GET `/api/v1/audit-events` | yes | true no-mock HTTP | `API_tests/audit.api.spec.ts`, `API_tests/coverage-expansion.api.spec.ts` | list audit route |
| GET `/api/v1/audit-events/:id` | yes | true no-mock HTTP | `API_tests/coverage-expansion.api.spec.ts` | detail audit route |

### API Test Classification

1. **True No-Mock HTTP**
   - `API_tests/auth.api.spec.ts`
   - `API_tests/auth-challenge.api.spec.ts`
   - `API_tests/health.api.spec.ts`
   - `API_tests/download.api.spec.ts`
   - `API_tests/reservation-enrollment.api.spec.ts`
   - `API_tests/categories.api.spec.ts`
   - `API_tests/offerings-list.api.spec.ts`
   - `API_tests/audit.api.spec.ts`
   - `API_tests/coverage-expansion.api.spec.ts`
   - Evidence pattern: `Test.createTestingModule({ imports:[AppModule] })` + `createNestApplication()` + `request(app.getHttpServer())`

2. **HTTP with Mocking**
   - None detected.

3. **Non-HTTP**
   - all files under `repo/unit_tests/**/*.spec.ts`.

### Mock Detection

Search results for `jest.mock`, `vi.mock`, `sinon.stub`, DI override patterns:
- **No evidence found** in current test files.

### Coverage Summary

- Total endpoints: **52**
- Endpoints with exact-path HTTP request evidence: **50**
- Endpoints with strict true no-mock handler-path coverage: **47**  
  (3 are guard-only/indirect: `GET /users/me`, `GET /enrollments`, `POST /categories`)

Computed:
- HTTP coverage %: **96.2%** (`50/52`)
- True API coverage %: **90.4%** (`47/52`)

Remaining exact-path uncovered:
- `PUT /api/v1/categories/:id`
- `DELETE /api/v1/categories/:id`

### Unit Test Summary

Backend unit test files detected: **32** (`repo/unit_tests/**/*.spec.ts`)

Covered modules (file-level evidence):
- auth/guards/middleware: `unit_tests/auth/*`, `unit_tests/common/roles-guard.spec.ts`, `unit_tests/common/error-envelope.spec.ts`, `unit_tests/trace/trace-id.spec.ts`, `unit_tests/masking/masking.spec.ts`
- services/repositories: `unit_tests/users/users.service.spec.ts`, `unit_tests/reservations/reservations.service.spec.ts`, `unit_tests/audit/audit.spec.ts`, `unit_tests/tags/tags.spec.ts`, `unit_tests/categories/categories.spec.ts`, `unit_tests/files/files.service.spec.ts`, `unit_tests/files/file-validator.spec.ts`, `unit_tests/files/file-sniffing.spec.ts`, `unit_tests/files/download-token.spec.ts`, `unit_tests/idempotency/*`
- jobs: `unit_tests/jobs/jobs.spec.ts`
- content/enrollment domain logic: `unit_tests/content/*`, `unit_tests/enrollment/*`, `unit_tests/offerings/*`, `unit_tests/duplicate/duplicate-detection.spec.ts`, `unit_tests/encryption/encryption.spec.ts`

Important backend modules still weak or missing direct unit depth:
- controller-level unit tests for `admin.controller.ts`, `content.controller.ts`, `files.controller.ts` are still absent (API-level exists).
- deep transactional branches in `AuthService` and `ContentService` only partially covered by newly added tests.

Frontend detection (strict):
- Project type: **backend** (declared in README top).
- Frontend source files (`*.tsx/*.jsx/*.vue/*.svelte`) not found.
- Frontend test files not found.
- **Frontend unit tests: MISSING** (not a strict critical gap because project is backend).

### API Observability Check

Strengths:
- Many tests assert response body shape + metadata (`auth`, `health`, `offerings-list`, `coverage-expansion`).
- Request bodies/headers/idempotency keys are explicit in critical flows.

Weak spots:
- Some tests still rely on broad status assertions (e.g., 401/403/404 arrays).
- A subset of legacy tests still focus primarily on rejection status without side-effect assertions.

Overall observability: **moderate to strong**.

### Tests Check

- Success paths: **strongly improved** (auth, offerings, content-assets, tags, admin flows now have explicit positive calls).
- Failure paths: **present** (unauthorized/forbidden/invalid status/token).
- Edge cases: **moderate** (idempotency, invalid status filters, forged tokens); more boundary cases still possible.
- Validation coverage: **moderate-good**.
- Auth/permissions: **good** with role-aware paths in expansion suite.
- Integration boundaries: **good** at HTTP layer; still room for stronger deterministic DB fixture assertions for all side effects.
- run_tests.sh: **Docker-based and pinned image** (`node:20-bookworm-slim`) => compliant.

### Test Coverage Score (0–100)

**91 / 100**

### Score Rationale

- High endpoint coverage and true no-mock API coverage now present.
- No mocking anti-patterns detected in API suite.
- Unit suite breadth materially improved with added module-specific tests.
- Remaining deductions: 2 uncovered category mutating endpoints and some shallow/assertion-light negative tests.

### Key Gaps

1. Missing exact-path coverage:
   - `PUT /api/v1/categories/:id`
   - `DELETE /api/v1/categories/:id`
2. Guard-only checks still counted for some routes (`GET /users/me`, `GET /enrollments`, `POST /categories`) without successful handler-path assertions.
3. Controller-level unit tests for some controllers are still not present (partially offset by e2e coverage).

### Confidence & Assumptions

- Confidence: **high** for static endpoint and request-path mapping.
- Confidence: **medium-high** for "real handler path" where tests assert only auth rejection.
- Assumptions: Nest route/prefix behavior and controller decorators reflect actual runtime paths.

### Test Coverage Verdict

**PARTIAL PASS (strict mode)**  
Rationale: very strong improvement, but not complete due to two uncovered endpoints and some guard-only coverage cases.

---

## 2) README Audit

Audited file: `repo/README.md`

### Hard Gate Results

1. Formatting/readability: **PASS**
   - structured markdown headings/tables/code blocks.

2. Startup instructions (`docker-compose up` required for backend/fullstack): **PASS**
   - explicit `docker-compose up` present in Quick Start.

3. Access method (URL + port): **PASS**
   - base URL, prefix, health URL, auth header documented in `## Access`.

4. Verification method: **PASS**
   - health check + auth flow + business flow steps documented in `## Verification Flows`.

5. Environment rules (Docker-contained only, no host installs): **PASS**
   - no host `npm install` guidance; testing section explicitly says Docker-contained only.

6. Demo credentials/roles (auth conditional): **PASS**
   - explicit credentials table for `admin`, `content_manager`, `enrollment_manager`, `learner`.
   - provisioning guidance included if pre-seeded accounts are absent.

### Engineering Quality

- Tech stack clarity: **strong**
- Architecture explanation: **strong**
- Testing instructions: **strong** (dockerized and explicit)
- Security/roles guidance: **good**
- Workflow guidance: **good**
- Presentation quality: **strong**

### High Priority Issues

- None hard-blocking found in current README against provided strict gates.

### Medium Priority Issues

- Demo credentials appear documented as static examples; environment-specific seed automation script is not directly linked.

### Low Priority Issues

- Could add a concise role-to-endpoint quick matrix for operators.

### Hard Gate Failures

- **None**

### README Verdict

**PASS**

---

## Final Combined Verdicts

1. **Test Coverage Audit:** PARTIAL PASS  
2. **README Audit:** PASS

Overall strict status: **substantially improved and close to full compliance**; remaining technical gap is complete HTTP endpoint closure for the two category mutation routes and converting guard-only checks into handler-path assertions where needed.
# Combined Static Audit: Test Coverage + README
# Test Coverage Audit

Date: 2026-04-14  
Mode: Static-only inspection (no runtime/test execution)
## Scope

Project type declaration at README top: **missing explicit type keyword** (`backend/fullstack/web/android/ios/desktop`).  
Inferred project type (light inspection): **backend** (evidence: `repo/README.md` describes "backend API"; no frontend source/test assets found via `**/*.{tsx,jsx,vue,svelte,html}`).
- Audit mode: static inspection only. No code, tests, scripts, containers, servers, or package managers were run.
- Repository root inspected: `repo/`
- README path inspected: `repo/README.md`
- Project type declaration at README top: missing.
- Inferred project type: `backend`
- Inference evidence:
  - README describes a "backend API" and NestJS/PostgreSQL stack: `repo/README.md:5`, `repo/README.md:40-45`
  - Global API bootstrap in NestJS: `repo/src/main.ts:10-37`
  - Controller-only route surface under `repo/src/*/*.controller.ts`
  - No frontend source or frontend test files were found in the inspected file inventory; inspected files are backend `.ts` modules, API tests, and unit tests only.

## Backend Endpoint Inventory

Global prefix: `api/v1` from `repo/src/main.ts:13`

| # | Endpoint | Controller evidence |
|---|---|---|
| 1 | `GET /api/v1/health` | `repo/src/health/health.controller.ts:6-12` `HealthController.check` |
| 2 | `GET /api/v1/auth/challenge` | `repo/src/auth/auth.controller.ts:82-93` `AuthController.getChallenge` |
| 3 | `POST /api/v1/auth/register` | `repo/src/auth/auth.controller.ts:96-105` `AuthController.register` |
| 4 | `POST /api/v1/auth/login` | `repo/src/auth/auth.controller.ts:107-120` `AuthController.login` |
| 5 | `POST /api/v1/auth/logout` | `repo/src/auth/auth.controller.ts:122-129` `AuthController.logout` |
| 6 | `POST /api/v1/auth/change-password` | `repo/src/auth/auth.controller.ts:131-142` `AuthController.changePassword` |
| 7 | `POST /api/v1/auth/reset-password` | `repo/src/auth/auth.controller.ts:144-149` `AuthController.resetPassword` |
| 8 | `GET /api/v1/users/me` | `repo/src/users/users.controller.ts:26-33` `UsersController.getMe` |
| 9 | `PATCH /api/v1/users/me` | `repo/src/users/users.controller.ts:35-41` `UsersController.updateMe` |
| 10 | `GET /api/v1/users` | `repo/src/users/users.controller.ts:43-54` `UsersController.findAll` |
| 11 | `GET /api/v1/users/:id` | `repo/src/users/users.controller.ts:56-61` `UsersController.findOne` |
| 12 | `POST /api/v1/admin/users/:id/reset-password` | `repo/src/users/admin.controller.ts:28-45` `AdminController.resetPassword` |
| 13 | `POST /api/v1/admin/users/:id/unlock` | `repo/src/users/admin.controller.ts:47-54` `AdminController.unlock` |
| 14 | `POST /api/v1/admin/users/:id/roles` | `repo/src/users/admin.controller.ts:56-73` `AdminController.assignRoles` |
| 15 | `DELETE /api/v1/admin/users/:id/roles/:roleId` | `repo/src/users/admin.controller.ts:75-82` `AdminController.removeRole` |
| 16 | `POST /api/v1/categories` | `repo/src/categories/categories.controller.ts:18-27` `CategoriesController.create` |
| 17 | `GET /api/v1/categories` | `repo/src/categories/categories.controller.ts:29-32` `CategoriesController.findAll` |
| 18 | `PUT /api/v1/categories/:id` | `repo/src/categories/categories.controller.ts:34-39` `CategoriesController.update` |
| 19 | `DELETE /api/v1/categories/:id` | `repo/src/categories/categories.controller.ts:41-47` `CategoriesController.delete` |
| 20 | `POST /api/v1/tags` | `repo/src/tags/tags.controller.ts:17-26` `TagsController.create` |
| 21 | `GET /api/v1/tags` | `repo/src/tags/tags.controller.ts:28-35` `TagsController.findAll` |
| 22 | `DELETE /api/v1/tags/:id` | `repo/src/tags/tags.controller.ts:37-43` `TagsController.delete` |
| 23 | `POST /api/v1/offerings` | `repo/src/offerings/offerings.controller.ts:89-111` `OfferingsController.create` |
| 24 | `GET /api/v1/offerings` | `repo/src/offerings/offerings.controller.ts:113-121` `OfferingsController.findAll` |
| 25 | `GET /api/v1/offerings/:id` | `repo/src/offerings/offerings.controller.ts:123-126` `OfferingsController.findOne` |
| 26 | `GET /api/v1/offerings/:id/enrollments` | `repo/src/offerings/offerings.controller.ts:128-137` `OfferingsController.getEnrollments` |
| 27 | `GET /api/v1/offerings/:id/waitlist` | `repo/src/offerings/offerings.controller.ts:139-147` `OfferingsController.getWaitlist` |
| 28 | `PUT /api/v1/offerings/:id` | `repo/src/offerings/offerings.controller.ts:149-170` `OfferingsController.update` |
| 29 | `POST /api/v1/reservations` | `repo/src/reservations/reservations.controller.ts:23-38` `ReservationsController.create` |
| 30 | `GET /api/v1/reservations/:id` | `repo/src/reservations/reservations.controller.ts:40-50` `ReservationsController.findOne` |
| 31 | `DELETE /api/v1/reservations/:id` | `repo/src/reservations/reservations.controller.ts:52-69` `ReservationsController.release` |
| 32 | `POST /api/v1/enrollments/confirm` | `repo/src/enrollments/enrollments.controller.ts:75-90` `EnrollmentsController.confirm` |
| 33 | `POST /api/v1/enrollments/:id/cancel` | `repo/src/enrollments/enrollments.controller.ts:92-110` `EnrollmentsController.cancel` |
| 34 | `POST /api/v1/enrollments/:id/approve` | `repo/src/enrollments/enrollments.controller.ts:112-121` `EnrollmentsController.approve` |
| 35 | `POST /api/v1/enrollments/:id/confirm-approved` | `repo/src/enrollments/enrollments.controller.ts:123-136` `EnrollmentsController.confirmApproved` |
| 36 | `GET /api/v1/enrollments` | `repo/src/enrollments/enrollments.controller.ts:138-150` `EnrollmentsController.findAll` |
| 37 | `GET /api/v1/enrollments/:id` | `repo/src/enrollments/enrollments.controller.ts:152-162` `EnrollmentsController.findOne` |
| 38 | `GET /api/v1/files/download` | `repo/src/files/files.controller.ts:18-52` `FilesController.download` |
| 39 | `POST /api/v1/content-assets` | `repo/src/content/content.controller.ts:105-141` `ContentController.create` |
| 40 | `GET /api/v1/content-assets` | `repo/src/content/content.controller.ts:143-156` `ContentController.findAll` |
| 41 | `GET /api/v1/content-assets/:id` | `repo/src/content/content.controller.ts:158-160` `ContentController.findOne` |
| 42 | `PUT /api/v1/content-assets/:id` | `repo/src/content/content.controller.ts:163-186` `ContentController.update` |
| 43 | `GET /api/v1/content-assets/:id/versions` | `repo/src/content/content.controller.ts:188-190` `ContentController.getVersions` |
| 44 | `GET /api/v1/content-assets/:id/versions/:versionId` | `repo/src/content/content.controller.ts:193-199` `ContentController.getVersion` |
| 45 | `POST /api/v1/content-assets/:id/rollback` | `repo/src/content/content.controller.ts:201-210` `ContentController.rollback` |
| 46 | `GET /api/v1/content-assets/:id/versions/:versionId/download-token` | `repo/src/content/content.controller.ts:212-219` `ContentController.getDownloadToken` |
| 47 | `GET /api/v1/content-assets/:id/lineage` | `repo/src/content/content.controller.ts:221-224` `ContentController.getLineage` |
| 48 | `POST /api/v1/content-assets/:id/merge` | `repo/src/content/content.controller.ts:226-235` `ContentController.merge` |
| 49 | `GET /api/v1/content-assets/:id/parsed` | `repo/src/content/content.controller.ts:237-245` `ContentController.getParsedDocuments` |
| 50 | `GET /api/v1/content-assets/:id/duplicates` | `repo/src/content/content.controller.ts:247-252` `ContentController.getDuplicates` |
| 51 | `GET /api/v1/audit-events` | `repo/src/audit/audit.controller.ts:6-35` `AuditController.findAll` |
| 52 | `GET /api/v1/audit-events/:id` | `repo/src/audit/audit.controller.ts:37-40` `AuditController.findOne` |

## API Test Classification

### 1. True No-Mock HTTP

All API test files bootstrap `AppModule` through Nest testing and send HTTP requests through `request(app.getHttpServer())`:

---
- `repo/API_tests/health.api.spec.ts:12-30`
- `repo/API_tests/auth-challenge.api.spec.ts:12-30`
- `repo/API_tests/auth.api.spec.ts:15-149`
- `repo/API_tests/categories.api.spec.ts:14-60`
- `repo/API_tests/download.api.spec.ts:13-59`
- `repo/API_tests/offerings-list.api.spec.ts:14-73`
- `repo/API_tests/audit.api.spec.ts:14-50`
- `repo/API_tests/reservation-enrollment.api.spec.ts:36-127`

## 1) Test Coverage Audit
No `overrideProvider`, `overrideGuard`, `jest.mock`, `vi.mock`, or `sinon.stub` calls were found under `repo/API_tests/`.

### Scope and Method
- Endpoint inventory derived from NestJS controllers + global prefix.
- Global prefix resolved from `repo/src/main.ts` (`app.setGlobalPrefix('api/v1')`).
- Endpoint = unique `METHOD + resolved PATH`.
- Coverage rule used: endpoint is considered covered only when HTTP test request targets that exact route and (statically) appears to reach real handler path (not only blocked at guard).
### 2. HTTP with Mocking

### Backend Endpoint Inventory
- None found in `repo/API_tests/` by static inspection.

Total endpoints found: **52**
### 3. Non-HTTP (unit / indirect)

1. `GET /api/v1/health`
2. `GET /api/v1/auth/challenge`
3. `POST /api/v1/auth/register`
4. `POST /api/v1/auth/login`
5. `POST /api/v1/auth/logout`
6. `POST /api/v1/auth/change-password`
7. `POST /api/v1/auth/reset-password`
8. `GET /api/v1/users/me`
9. `PATCH /api/v1/users/me`
10. `GET /api/v1/users`
11. `GET /api/v1/users/:id`
12. `POST /api/v1/admin/users/:id/reset-password`
13. `POST /api/v1/admin/users/:id/unlock`
14. `POST /api/v1/admin/users/:id/roles`
15. `DELETE /api/v1/admin/users/:id/roles/:roleId`
16. `POST /api/v1/content-assets`
17. `GET /api/v1/content-assets`
18. `GET /api/v1/content-assets/:id`
19. `PUT /api/v1/content-assets/:id`
20. `GET /api/v1/content-assets/:id/versions`
21. `GET /api/v1/content-assets/:id/versions/:versionId`
22. `POST /api/v1/content-assets/:id/rollback`
23. `GET /api/v1/content-assets/:id/versions/:versionId/download-token`
24. `GET /api/v1/content-assets/:id/lineage`
25. `POST /api/v1/content-assets/:id/merge`
26. `GET /api/v1/content-assets/:id/parsed`
27. `GET /api/v1/content-assets/:id/duplicates`
28. `GET /api/v1/files/download`
29. `POST /api/v1/reservations`
30. `GET /api/v1/reservations/:id`
31. `DELETE /api/v1/reservations/:id`
32. `POST /api/v1/enrollments/confirm`
33. `POST /api/v1/enrollments/:id/cancel`
34. `POST /api/v1/enrollments/:id/approve`
35. `POST /api/v1/enrollments/:id/confirm-approved`
36. `GET /api/v1/enrollments`
37. `GET /api/v1/enrollments/:id`
38. `POST /api/v1/offerings`
39. `GET /api/v1/offerings`
40. `GET /api/v1/offerings/:id`
41. `GET /api/v1/offerings/:id/enrollments`
42. `GET /api/v1/offerings/:id/waitlist`
43. `PUT /api/v1/offerings/:id`
44. `POST /api/v1/categories`
45. `GET /api/v1/categories`
46. `PUT /api/v1/categories/:id`
47. `DELETE /api/v1/categories/:id`
48. `POST /api/v1/tags`
49. `GET /api/v1/tags`
50. `DELETE /api/v1/tags/:id`
51. `GET /api/v1/audit-events`
52. `GET /api/v1/audit-events/:id`
Backend unit tests exist under `repo/unit_tests/` and primarily exercise services, guards, interceptors, validators, and pure logic:

Controller evidence: `repo/src/*/*.controller.ts` and `repo/src/main.ts`.
- Service-backed unit tests: `repo/unit_tests/audit/audit.spec.ts`, `repo/unit_tests/categories/categories.spec.ts`, `repo/unit_tests/tags/tags.spec.ts`, `repo/unit_tests/offerings/offering-validation.spec.ts`, `repo/unit_tests/auth/pow.spec.ts`, `repo/unit_tests/auth/lockout.spec.ts`, `repo/unit_tests/files/file-validator.spec.ts`, `repo/unit_tests/files/download-token.spec.ts`, `repo/unit_tests/files/file-sniffing.spec.ts`, `repo/unit_tests/idempotency/*.spec.ts`, `repo/unit_tests/content/parsing.spec.ts`, `repo/unit_tests/duplicate/duplicate-detection.spec.ts`, `repo/unit_tests/encryption/encryption.spec.ts`
- Guard / interceptor / validator tests: `repo/unit_tests/auth/rate-limit.spec.ts`, `repo/unit_tests/trace/trace-id.spec.ts`, `repo/unit_tests/common/error-envelope.spec.ts`, `repo/unit_tests/masking/masking.spec.ts`, `repo/unit_tests/auth/password-validator.spec.ts`
- Logic-only tests with weak linkage to runtime code: `repo/unit_tests/enrollment/lifecycle.spec.ts`, `repo/unit_tests/enrollment/state-machine.spec.ts`, `repo/unit_tests/content/lifecycle.spec.ts`, `repo/unit_tests/content/versioning.spec.ts`, `repo/unit_tests/offerings/eligibility.spec.ts`

### API Test Mapping Table
## API Test Mapping Table

Coverage rule applied strictly: covered only if a test sends a request to the exact `METHOD + PATH`. Conditional execution was not assumed.

| Endpoint | Covered | Test type | Test files | Evidence |
|---|---|---|---|---|
| `GET /api/v1/health` | yes | true no-mock HTTP | `API_tests/health.api.spec.ts` | `it('GET /api/v1/health returns health payload and metadata')` |
| `GET /api/v1/auth/challenge` | yes | true no-mock HTTP | `API_tests/auth-challenge.api.spec.ts`, `API_tests/helpers/pow.ts` | direct `.get('/api/v1/auth/challenge')` |
| `POST /api/v1/auth/register` | yes | true no-mock HTTP | `API_tests/auth.api.spec.ts`, `API_tests/helpers/pow.ts` | `describe('POST /api/v1/auth/register')` |
| `POST /api/v1/auth/login` | yes | true no-mock HTTP | `API_tests/auth.api.spec.ts`, `API_tests/download.api.spec.ts`, `API_tests/categories.api.spec.ts`, `API_tests/offerings-list.api.spec.ts`, `API_tests/audit.api.spec.ts`, `API_tests/reservation-enrollment.api.spec.ts` | multiple `.post('/api/v1/auth/login')` |
| `POST /api/v1/auth/logout` | no | none | — | no request found in API tests |
| `POST /api/v1/auth/change-password` | no | none | — | no request found in API tests |
| `POST /api/v1/auth/reset-password` | no | none | — | no request found in API tests |
| `GET /api/v1/users/me` | no (guard-only) | unit-only / indirect | `API_tests/auth.api.spec.ts` | request exists but unauthenticated 401 (`Protected endpoints require auth`) |
| `PATCH /api/v1/users/me` | no | none | — | no request found in API tests |
| `GET /api/v1/users` | no | none | — | no request found in API tests |
| `GET /api/v1/users/:id` | no | none | — | no request found in API tests |
| `POST /api/v1/admin/users/:id/reset-password` | no | none | — | no request found in API tests |
| `POST /api/v1/admin/users/:id/unlock` | no | none | — | no request found in API tests |
| `POST /api/v1/admin/users/:id/roles` | no | none | — | no request found in API tests |
| `DELETE /api/v1/admin/users/:id/roles/:roleId` | no | none | — | no request found in API tests |
| `POST /api/v1/content-assets` | no | none | — | no request found in API tests |
| `GET /api/v1/content-assets` | no | none | — | no request found in API tests |
| `GET /api/v1/content-assets/:id` | no | none | — | no request found in API tests |
| `PUT /api/v1/content-assets/:id` | no | none | — | no request found in API tests |
| `GET /api/v1/content-assets/:id/versions` | no | none | — | no request found in API tests |
| `GET /api/v1/content-assets/:id/versions/:versionId` | no | none | — | no request found in API tests |
| `POST /api/v1/content-assets/:id/rollback` | no | none | — | no request found in API tests |
| `GET /api/v1/content-assets/:id/versions/:versionId/download-token` | no | none | — | no request found in API tests |
| `GET /api/v1/content-assets/:id/lineage` | no | none | — | no request found in API tests |
| `POST /api/v1/content-assets/:id/merge` | no | none | — | no request found in API tests |
| `GET /api/v1/content-assets/:id/parsed` | no | none | — | no request found in API tests |
| `GET /api/v1/content-assets/:id/duplicates` | no | none | — | no request found in API tests |
| `GET /api/v1/files/download` | yes (partial depth) | true no-mock HTTP | `API_tests/download.api.spec.ts`, `API_tests/auth.api.spec.ts` | auth-required + forged token flow |
| `POST /api/v1/reservations` | yes | true no-mock HTTP | `API_tests/reservation-enrollment.api.spec.ts` | `.post('/api/v1/reservations')` |
| `GET /api/v1/reservations/:id` | weak/conditional | true no-mock HTTP | `API_tests/reservation-enrollment.api.spec.ts` | call exists only inside `if (createRes.status < 300)` branch |
| `DELETE /api/v1/reservations/:id` | yes | true no-mock HTTP | `API_tests/reservation-enrollment.api.spec.ts` | `.delete(\`/api/v1/reservations/${fakeResId}\`)` |
| `POST /api/v1/enrollments/confirm` | no | none | — | no request found in API tests |
| `POST /api/v1/enrollments/:id/cancel` | yes | true no-mock HTTP | `API_tests/reservation-enrollment.api.spec.ts` | `.post(\`/api/v1/enrollments/${fakeEnrollmentId}/cancel\`)` |
| `POST /api/v1/enrollments/:id/approve` | no | none | — | no request found in API tests |
| `POST /api/v1/enrollments/:id/confirm-approved` | no | none | — | no request found in API tests |
| `GET /api/v1/enrollments` | no (guard-only) | unit-only / indirect | `API_tests/auth.api.spec.ts` | unauthenticated 401 only |
| `GET /api/v1/enrollments/:id` | yes (negative-path) | true no-mock HTTP | `API_tests/reservation-enrollment.api.spec.ts` | `.get(\`/api/v1/enrollments/${fakeEnrollmentId}\`)` |
| `POST /api/v1/offerings` | no | none | — | no request found in API tests |
| `GET /api/v1/offerings` | yes | true no-mock HTTP | `API_tests/offerings-list.api.spec.ts` | list + invalid status + query variation |
| `GET /api/v1/offerings/:id` | no | none | — | no request found in API tests |
| `GET /api/v1/offerings/:id/enrollments` | no | none | — | no request found in API tests |
| `GET /api/v1/offerings/:id/waitlist` | no | none | — | no request found in API tests |
| `PUT /api/v1/offerings/:id` | no | none | — | no request found in API tests |
| `POST /api/v1/categories` | no (guard-only) | HTTP with authorization rejection | `API_tests/categories.api.spec.ts` | 401/403 assertion only |
| `GET /api/v1/categories` | yes | true no-mock HTTP | `API_tests/categories.api.spec.ts` | authenticated `.get('/api/v1/categories')` |
| `PUT /api/v1/categories/:id` | no | none | — | no request found in API tests |
| `DELETE /api/v1/categories/:id` | no | none | — | no request found in API tests |
| `POST /api/v1/tags` | no | none | — | no request found in API tests |
| `GET /api/v1/tags` | no | none | — | no request found in API tests |
| `DELETE /api/v1/tags/:id` | no | none | — | no request found in API tests |
| `GET /api/v1/audit-events` | no (guard-only) | HTTP with authorization rejection | `API_tests/audit.api.spec.ts` | 403 non-admin check only |
| `GET /api/v1/audit-events/:id` | no | none | — | no request found in API tests |
| `GET /api/v1/health` | yes | true no-mock HTTP | `repo/API_tests/health.api.spec.ts` | `GET /api/v1/health returns health payload and metadata` at `repo/API_tests/health.api.spec.ts:29` |
| `GET /api/v1/auth/challenge` | yes | true no-mock HTTP | `repo/API_tests/auth-challenge.api.spec.ts`, `repo/API_tests/helpers/pow.ts` | `GET /api/v1/auth/challenge returns challenge fields` at `repo/API_tests/auth-challenge.api.spec.ts:29`; helper request at `repo/API_tests/helpers/pow.ts:39` |
| `POST /api/v1/auth/register` | yes | true no-mock HTTP | `repo/API_tests/auth.api.spec.ts`, `repo/API_tests/helpers/pow.ts` | register tests at `repo/API_tests/auth.api.spec.ts:35`, `:56`, `:70`; helper POST at `repo/API_tests/helpers/pow.ts:43` |
| `POST /api/v1/auth/login` | yes | true no-mock HTTP | `repo/API_tests/auth.api.spec.ts`, `repo/API_tests/categories.api.spec.ts`, `repo/API_tests/offerings-list.api.spec.ts`, `repo/API_tests/audit.api.spec.ts`, `repo/API_tests/download.api.spec.ts`, `repo/API_tests/reservation-enrollment.api.spec.ts` | login tests at `repo/API_tests/auth.api.spec.ts:100`, `:118`; additional login setup at `repo/API_tests/categories.api.spec.ts:32`, `repo/API_tests/offerings-list.api.spec.ts:32`, `repo/API_tests/audit.api.spec.ts:32`, `repo/API_tests/download.api.spec.ts:47`, `repo/API_tests/reservation-enrollment.api.spec.ts:28` |
| `POST /api/v1/auth/logout` | no | unit-only / indirect | none | endpoint defined at `repo/src/auth/auth.controller.ts:122-129`; no exact request found in `repo/API_tests/` |
| `POST /api/v1/auth/change-password` | no | unit-only / indirect | none | endpoint defined at `repo/src/auth/auth.controller.ts:131-142`; no exact request found |
| `POST /api/v1/auth/reset-password` | no | unit-only / indirect | none | endpoint defined at `repo/src/auth/auth.controller.ts:144-149`; no exact request found |
| `GET /api/v1/users/me` | yes | true no-mock HTTP | `repo/API_tests/auth.api.spec.ts` | unauthenticated access test at `repo/API_tests/auth.api.spec.ts:130` |
| `PATCH /api/v1/users/me` | no | unit-only / indirect | none | endpoint defined at `repo/src/users/users.controller.ts:35-41`; no exact request found |
| `GET /api/v1/users` | no | unit-only / indirect | none | endpoint defined at `repo/src/users/users.controller.ts:43-54`; no exact request found |
| `GET /api/v1/users/:id` | no | unit-only / indirect | none | endpoint defined at `repo/src/users/users.controller.ts:56-61`; no exact request found |
| `POST /api/v1/admin/users/:id/reset-password` | no | unit-only / indirect | none | endpoint defined at `repo/src/users/admin.controller.ts:39-45`; no exact request found |
| `POST /api/v1/admin/users/:id/unlock` | no | unit-only / indirect | none | endpoint defined at `repo/src/users/admin.controller.ts:47-54`; no exact request found |
| `POST /api/v1/admin/users/:id/roles` | no | unit-only / indirect | none | endpoint defined at `repo/src/users/admin.controller.ts:56-73`; no exact request found |
| `DELETE /api/v1/admin/users/:id/roles/:roleId` | no | unit-only / indirect | none | endpoint defined at `repo/src/users/admin.controller.ts:75-82`; no exact request found |
| `POST /api/v1/categories` | yes | true no-mock HTTP | `repo/API_tests/categories.api.spec.ts` | `POST /api/v1/categories requires enrollment_manager or admin` at `repo/API_tests/categories.api.spec.ts:54` |
| `GET /api/v1/categories` | yes | true no-mock HTTP | `repo/API_tests/categories.api.spec.ts` | `GET /api/v1/categories returns list...` at `repo/API_tests/categories.api.spec.ts:42` |
| `PUT /api/v1/categories/:id` | no | unit-only / indirect | none | endpoint defined at `repo/src/categories/categories.controller.ts:34-39`; no exact request found |
| `DELETE /api/v1/categories/:id` | no | unit-only / indirect | none | endpoint defined at `repo/src/categories/categories.controller.ts:41-47`; no exact request found |
| `POST /api/v1/tags` | no | unit-only / indirect | none | endpoint defined at `repo/src/tags/tags.controller.ts:21-26`; no exact request found |
| `GET /api/v1/tags` | no | unit-only / indirect | none | endpoint defined at `repo/src/tags/tags.controller.ts:28-35`; no exact request found |
| `DELETE /api/v1/tags/:id` | no | unit-only / indirect | none | endpoint defined at `repo/src/tags/tags.controller.ts:37-43`; no exact request found |
| `POST /api/v1/offerings` | no | unit-only / indirect | none | endpoint defined at `repo/src/offerings/offerings.controller.ts:96-111`; no exact request found |
| `GET /api/v1/offerings` | yes | true no-mock HTTP | `repo/API_tests/offerings-list.api.spec.ts` | offerings list tests at `repo/API_tests/offerings-list.api.spec.ts:42`, `:57`, `:66` |
| `GET /api/v1/offerings/:id` | no | unit-only / indirect | none | endpoint defined at `repo/src/offerings/offerings.controller.ts:123-126`; no exact request found |
| `GET /api/v1/offerings/:id/enrollments` | no | unit-only / indirect | none | endpoint defined at `repo/src/offerings/offerings.controller.ts:128-137`; no exact request found |
| `GET /api/v1/offerings/:id/waitlist` | no | unit-only / indirect | none | endpoint defined at `repo/src/offerings/offerings.controller.ts:139-147`; no exact request found |
| `PUT /api/v1/offerings/:id` | no | unit-only / indirect | none | endpoint defined at `repo/src/offerings/offerings.controller.ts:149-170`; no exact request found |
| `POST /api/v1/reservations` | yes | true no-mock HTTP | `repo/API_tests/reservation-enrollment.api.spec.ts` | request sent in tests at `repo/API_tests/reservation-enrollment.api.spec.ts:66`, `:121` |
| `GET /api/v1/reservations/:id` | no | unit-only / indirect | `repo/API_tests/reservation-enrollment.api.spec.ts` | only conditional branch exists at `repo/API_tests/reservation-enrollment.api.spec.ts:72-80`; static inspection cannot guarantee request executes |
| `DELETE /api/v1/reservations/:id` | yes | true no-mock HTTP | `repo/API_tests/reservation-enrollment.api.spec.ts` | delete request at `repo/API_tests/reservation-enrollment.api.spec.ts:83` |
| `POST /api/v1/enrollments/confirm` | no | unit-only / indirect | none | endpoint defined at `repo/src/enrollments/enrollments.controller.ts:79-90`; no exact request found |
| `POST /api/v1/enrollments/:id/cancel` | yes | true no-mock HTTP | `repo/API_tests/reservation-enrollment.api.spec.ts` | cancel request at `repo/API_tests/reservation-enrollment.api.spec.ts:106` |
| `POST /api/v1/enrollments/:id/approve` | no | unit-only / indirect | none | endpoint defined at `repo/src/enrollments/enrollments.controller.ts:112-121`; no exact request found |
| `POST /api/v1/enrollments/:id/confirm-approved` | no | unit-only / indirect | none | endpoint defined at `repo/src/enrollments/enrollments.controller.ts:123-136`; no exact request found |
| `GET /api/v1/enrollments` | yes | true no-mock HTTP | `repo/API_tests/auth.api.spec.ts` | unauthenticated access test at `repo/API_tests/auth.api.spec.ts:138` |
| `GET /api/v1/enrollments/:id` | yes | true no-mock HTTP | `repo/API_tests/reservation-enrollment.api.spec.ts` | request at `repo/API_tests/reservation-enrollment.api.spec.ts:96` |
| `GET /api/v1/files/download` | yes | true no-mock HTTP | `repo/API_tests/download.api.spec.ts`, `repo/API_tests/auth.api.spec.ts` | tests at `repo/API_tests/download.api.spec.ts:31`, `:38`; unauthenticated access at `repo/API_tests/auth.api.spec.ts:146` |
| `POST /api/v1/content-assets` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:113-141`; no exact request found |
| `GET /api/v1/content-assets` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:143-156`; no exact request found |
| `GET /api/v1/content-assets/:id` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:158-160`; no exact request found |
| `PUT /api/v1/content-assets/:id` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:163-186`; no exact request found |
| `GET /api/v1/content-assets/:id/versions` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:188-190`; no exact request found |
| `GET /api/v1/content-assets/:id/versions/:versionId` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:193-199`; no exact request found |
| `POST /api/v1/content-assets/:id/rollback` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:201-210`; no exact request found |
| `GET /api/v1/content-assets/:id/versions/:versionId/download-token` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:212-219`; no exact request found |
| `GET /api/v1/content-assets/:id/lineage` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:221-224`; no exact request found |
| `POST /api/v1/content-assets/:id/merge` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:226-235`; no exact request found |
| `GET /api/v1/content-assets/:id/parsed` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:237-245`; no exact request found |
| `GET /api/v1/content-assets/:id/duplicates` | no | unit-only / indirect | none | endpoint defined at `repo/src/content/content.controller.ts:247-252`; no exact request found |
| `GET /api/v1/audit-events` | yes | true no-mock HTTP | `repo/API_tests/audit.api.spec.ts` | `GET /api/v1/audit-events forbids non-admin users` at `repo/API_tests/audit.api.spec.ts:42` |
| `GET /api/v1/audit-events/:id` | no | unit-only / indirect | none | endpoint defined at `repo/src/audit/audit.controller.ts:37-40`; no exact request found |

### API Test Classification
## Mock Detection

#### 1. True No-Mock HTTP
- `API_tests/auth.api.spec.ts` (imports `AppModule`, sends real HTTP via `supertest`)
- `API_tests/auth-challenge.api.spec.ts`
- `API_tests/health.api.spec.ts`
- `API_tests/download.api.spec.ts`
- `API_tests/reservation-enrollment.api.spec.ts`
- `API_tests/categories.api.spec.ts`
- `API_tests/offerings-list.api.spec.ts`
- `API_tests/audit.api.spec.ts`
- helper used by tests: `API_tests/helpers/pow.ts`
### API tests

Evidence of real app bootstrap pattern:
- `Test.createTestingModule({ imports: [AppModule] })`
- `app = moduleFixture.createNestApplication()`
- `request(app.getHttpServer())...`
- No API-test mocking artifacts found under `repo/API_tests/`: no `jest.mock`, `vi.mock`, `sinon.stub`, `overrideProvider`, or `overrideGuard`.

#### 2. HTTP with Mocking
- **None found**.
- Search evidence: no `jest.mock`, `vi.mock`, `sinon.stub`, `overrideProvider` in repo test sources.
### Non-HTTP tests with mocking

#### 3. Non-HTTP (unit/integration without HTTP)
- All files under `repo/unit_tests/**/*.spec.ts` are non-HTTP test suite.
Representative mocked dependencies found in unit tests:

### Mock Detection
- API test mocking patterns detected: **none**.
- Repo-wide scan for mocking hooks in tests: no matches for `jest.mock(...)`, `vi.mock(...)`, `sinon.stub(...)`, `overrideProvider(...)`.
- Repository mock for `CategoriesService`: `repo/unit_tests/categories/categories.spec.ts:7-15`
- Query builder and repository mocks for `TagsService`: `repo/unit_tests/tags/tags.spec.ts:7-21`
- Repository mock for `AuditService`: `repo/unit_tests/audit/audit.spec.ts:7-23`
- Audit-service mock inside file validation tests: `repo/unit_tests/files/file-validator.spec.ts:8-14`
- Audit-service mock inside file sniffing tests: `repo/unit_tests/files/file-sniffing.spec.ts:13-15`
- Repository and query-builder mocks for `IdempotencyService`: `repo/unit_tests/idempotency/idempotency.spec.ts:8-16`, `repo/unit_tests/idempotency/callback-dedup.spec.ts:11-20`, `repo/unit_tests/idempotency/idempotency-isolation.spec.ts:15-30`
- Mock repositories and audit service for `OfferingsService`: `repo/unit_tests/offerings/offering-validation.spec.ts:7-17`
- Mock user/login repositories and audit service for `LockoutService`: `repo/unit_tests/auth/lockout.spec.ts:8-25`
- Mock repository for `PowService`: `repo/unit_tests/auth/pow.spec.ts:7-16`
- Mock transaction manager, repositories, idempotency service, and audit service for `EnrollmentsService`: `repo/unit_tests/enrollment/approval-flow.spec.ts:26-99`
- Mock request/response objects for `RateLimitGuard`, `TraceIdInterceptor`, and `HttpExceptionFilter`: `repo/unit_tests/auth/rate-limit.spec.ts:8-22`, `repo/unit_tests/trace/trace-id.spec.ts:10-69`, `repo/unit_tests/common/error-envelope.spec.ts:12-30`

### Coverage Summary
- Total endpoints: **52**
- Endpoints with any HTTP request evidence (including guard-only/conditional): **16**
- Endpoints with strict true handler-path HTTP coverage (no mock, not only guard rejection): **11**  
  (plus 1 conditional/weak: `GET /api/v1/reservations/:id`)
## Coverage Summary

Computed metrics:
- HTTP coverage % (request evidence): **30.8%** (`16/52`)
- True API coverage % (strict handler-path): **21.2%** (`11/52`)
- Total endpoints: `52`
- Endpoints with HTTP tests: `15`
- Endpoints with true no-mock HTTP tests: `15`
- HTTP coverage: `28.8%` (`15 / 52`)
- True API coverage: `28.8%` (`15 / 52`)

### Unit Test Summary
Uncovered areas are concentrated in:

#### Backend Unit Tests
- Unit test files detected: **26** (`repo/unit_tests/**/*.spec.ts`).
- Covered areas (file evidence):
  - **Services/business logic:** content, offerings, enrollments, categories, tags, idempotency, duplicate detection (`unit_tests/content/*`, `unit_tests/offerings/*`, `unit_tests/enrollment/*`, `unit_tests/categories/categories.spec.ts`, `unit_tests/tags/tags.spec.ts`, `unit_tests/idempotency/*`, `unit_tests/duplicate/*`)
  - **Security/auth logic:** password rules, lockout, rate limit, PoW (`unit_tests/auth/*`)
  - **Files/token validation:** file validator/sniffing/download token (`unit_tests/files/*`)
  - **Interceptors/filters helpers:** masking, trace-id, error envelope (`unit_tests/masking/masking.spec.ts`, `unit_tests/trace/trace-id.spec.ts`, `unit_tests/common/error-envelope.spec.ts`)
  - **Audit/encryption:** `unit_tests/audit/audit.spec.ts`, `unit_tests/encryption/encryption.spec.ts`
- Backend modules with weak or missing direct unit/API handler tests:
  - `users` module endpoints (`repo/src/users/*.controller.ts`) mostly untested via API/unit route tests.
  - `admin users` endpoints (`repo/src/users/admin.controller.ts`) no API tests.
  - `content-assets` endpoint surface (12 routes) largely untested at API layer.
  - `tags` API endpoints untested at HTTP layer.
  - `enrollments` confirm/approve/confirm-approved paths lack direct API route tests.
  - scheduled job behaviors (`repo/src/jobs/*.ts`) not covered as end-to-end scheduler tests.
- User management: `PATCH /users/me`, admin user endpoints, admin listing/detail endpoints
- Tag endpoints: all uncovered
- Offerings write/detail/admin subresources: all uncovered except listing
- Content asset API: all 12 endpoints uncovered
- Auth maintenance endpoints: logout, change-password, reset-password uncovered
- Enrollment write flows: confirm, approve, confirm-approved uncovered
- Audit detail endpoint uncovered

## Unit Test Summary

### Backend Unit Tests

#### Frontend Unit Tests (Strict Requirement)
- Frontend source files detected: **none** (`**/*.{tsx,jsx,vue,svelte,html}` returned 0).
- Frontend test files detected: **none** (`**/*.{test,spec}.{tsx,jsx,vue,svelte}` returned 0).
- Frontend frameworks/tools detected: **none**.
- Components/modules covered: **none**.
- Important frontend components/modules not tested: **not applicable (frontend code absent)**.
- **Frontend unit tests: MISSING**.
- CRITICAL GAP rule (fullstack/web only): **not triggered** because inferred project type is backend.
Detected backend unit test files:

### API Observability Check
- Strong observability examples:
  - `API_tests/health.api.spec.ts` validates request path and response payload/meta fields.
  - `API_tests/offerings-list.api.spec.ts` validates query behavior and error payload.
- Weak observability examples:
  - `API_tests/reservation-enrollment.api.spec.ts` uses random UUIDs and often asserts 404/non-204 without seeded domain fixtures.
  - `GET /reservations/:id` check is conditional branch; may skip.
  - Several checks validate only status code (limited response-contract assurance).
- `repo/unit_tests/audit/audit.spec.ts`
- `repo/unit_tests/auth/lockout.spec.ts`
- `repo/unit_tests/auth/password-validator.spec.ts`
- `repo/unit_tests/auth/pow.spec.ts`
- `repo/unit_tests/auth/rate-limit.spec.ts`
- `repo/unit_tests/categories/categories.spec.ts`
- `repo/unit_tests/common/error-envelope.spec.ts`
- `repo/unit_tests/content/parsing.spec.ts`
- `repo/unit_tests/duplicate/duplicate-detection.spec.ts`
- `repo/unit_tests/encryption/encryption.spec.ts`
- `repo/unit_tests/enrollment/approval-flow.spec.ts`
- `repo/unit_tests/files/download-token.spec.ts`
- `repo/unit_tests/files/file-sniffing.spec.ts`
- `repo/unit_tests/files/file-validator.spec.ts`
- `repo/unit_tests/idempotency/callback-dedup.spec.ts`
- `repo/unit_tests/idempotency/idempotency-isolation.spec.ts`
- `repo/unit_tests/idempotency/idempotency.spec.ts`
- `repo/unit_tests/masking/masking.spec.ts`
- `repo/unit_tests/offerings/offering-validation.spec.ts`
- `repo/unit_tests/tags/tags.spec.ts`
- `repo/unit_tests/trace/trace-id.spec.ts`

Modules covered with direct source imports:

- Services:
  - `AuditService` via `repo/unit_tests/audit/audit.spec.ts:1`
  - `LockoutService` via `repo/unit_tests/auth/lockout.spec.ts:1`
  - `PowService` via `repo/unit_tests/auth/pow.spec.ts:1`
  - `CategoriesService` via `repo/unit_tests/categories/categories.spec.ts:1`
  - `ParsingService` via `repo/unit_tests/content/parsing.spec.ts:1`
  - `DuplicateDetectionService` via `repo/unit_tests/duplicate/duplicate-detection.spec.ts:1`
  - `EncryptionService` via `repo/unit_tests/encryption/encryption.spec.ts:1`
  - `EnrollmentsService` via `repo/unit_tests/enrollment/approval-flow.spec.ts:6`
  - `DownloadTokenService` via `repo/unit_tests/files/download-token.spec.ts:1`
  - `FileValidatorService` via `repo/unit_tests/files/file-validator.spec.ts:1`, `repo/unit_tests/files/file-sniffing.spec.ts:6`
  - `IdempotencyService` via `repo/unit_tests/idempotency/*.spec.ts`
  - `OfferingsService` via `repo/unit_tests/offerings/offering-validation.spec.ts:1`
  - `TagsService` via `repo/unit_tests/tags/tags.spec.ts:1`
- Guards / middleware / interceptors / validators:
  - `RateLimitGuard` via `repo/unit_tests/auth/rate-limit.spec.ts:1`
  - `HttpExceptionFilter` via `repo/unit_tests/common/error-envelope.spec.ts:1`
  - `maskObject` / `maskLastFour` via `repo/unit_tests/masking/masking.spec.ts:1`
  - `TraceIdInterceptor` via `repo/unit_tests/trace/trace-id.spec.ts:1`
  - password validator via `repo/unit_tests/auth/password-validator.spec.ts:1-4`

Important backend modules not directly unit-tested:

- `AuthService` (`repo/src/auth/auth.service.ts`)
- `UsersService` (`repo/src/users/users.service.ts`)
- `ReservationsService` (`repo/src/reservations/reservations.service.ts`)
- `FilesService` (`repo/src/files/files.service.ts`)
- `RolesService` (`repo/src/roles/roles.service.ts`)
- `ConfigService` (`repo/src/config/config.service.ts`)
- job handlers in `repo/src/jobs/*.ts`
- controllers as units: `AuthController`, `UsersController`, `AdminController`, `OfferingsController`, `ReservationsController`, `ContentController`, `FilesController`, `AuditController`, `HealthController`
- `RolesGuard` (`repo/src/common/guards/roles.guard.ts`)

Weak / low-value unit tests that do not exercise meaningful runtime code paths:

- `repo/unit_tests/enrollment/lifecycle.spec.ts` mostly mutates local literals and enum values
- `repo/unit_tests/enrollment/state-machine.spec.ts` validates a local transition map, not application code
- `repo/unit_tests/content/lifecycle.spec.ts` asserts local objects and dates, not `ContentService`
- `repo/unit_tests/content/versioning.spec.ts` uses a local `bumpVersion` helper instead of production logic, despite importing `ContentService`
- `repo/unit_tests/offerings/eligibility.spec.ts` validates a local helper and literals, not service/controller code

### Frontend Unit Tests

- Frontend test files: `NONE`
- Frameworks/tools detected: `NONE`
- Components/modules covered: `NONE`
- Important frontend components/modules not tested: not applicable; no frontend code was detected during scoped inspection.
- Frontend unit tests verdict: `NOT APPLICABLE` because the inferred project type is `backend`, not `web` or `fullstack`.

## API Observability Check

Overall verdict: `weak to mixed`

Strong examples:

- `repo/API_tests/health.api.spec.ts:29` shows exact endpoint and checks response payload plus metadata.
- `repo/API_tests/auth-challenge.api.spec.ts:29` asserts request result fields with explicit payload expectations.
- `repo/API_tests/offerings-list.api.spec.ts:42`, `:57`, `:66` shows query parameters and concrete response assertions.

Weak examples:

- `repo/API_tests/categories.api.spec.ts:54` only asserts forbidden/unauthorized behavior on `POST /categories`; no positive response shape.
- `repo/API_tests/audit.api.spec.ts:42` only asserts `403` and generic error fields.
- `repo/API_tests/download.api.spec.ts:31`, `:38` only covers rejection cases; no successful download path or response headers/body verification.
- `repo/API_tests/reservation-enrollment.api.spec.ts:83`, `:96`, `:106`, `:120` mostly assert status-only outcomes.
- `repo/API_tests/reservation-enrollment.api.spec.ts:64-80` contains a conditional GET-authorization branch that may never execute.

## Tests Check

- `repo/run_tests.sh` is Docker-based: `OK`
  - evidence: Docker-only execution path at `repo/run_tests.sh:28-39`, `:42-55`, `:58-125`
- Local dependency requirement inside the script itself: not found
- Production bootstrap parity gap in API tests:
  - `repo/src/main.ts:29-33` registers `MaskingInterceptor` and `AuditInterceptor`
  - API tests install only `TraceIdInterceptor` and `ResponseInterceptor`: e.g. `repo/API_tests/health.api.spec.ts:17-20`
  - consequence: the HTTP tests are still real no-mock route tests, but they do not fully represent the production middleware/interceptor stack.

## Test Quality & Sufficiency

- Success paths: present for `health`, `auth/challenge`, `auth/register`, `auth/login`, offerings listing, and categories listing.
- Failure cases: present for weak password, duplicate username, unauthenticated access, invalid offering filter, invalid/forged download token, non-admin audit access.
- Edge cases: partial only. Some validation coverage exists, but many write endpoints have no HTTP validation coverage.
- Auth/permissions: partial. Unauthorized and forbidden paths are exercised, but only for a small subset of endpoints.
- Integration boundaries: partial. The API suite boots the real app and database-backed services, but endpoint breadth is low.
- Assertion depth: inconsistent. Several tests only assert status codes or generic message strings.
- Meaningful vs autogenerated: mixed. Some unit tests are meaningful service tests; multiple others are pseudo-tests over local literals.

## End-to-End Expectations

Project type is inferred `backend`, so frontend-to-backend E2E was not expected.

Backend E2E expectation is still not met strongly:

- Only `15 / 52` endpoints have exact-path HTTP coverage.
- Entire modules (`content-assets`, `tags`, admin user management) have zero HTTP coverage.
- Core write flows such as `POST /enrollments/confirm`, `POST /enrollments/:id/approve`, `POST /content-assets`, and `PUT /content-assets/:id` are untested over HTTP.

## Test Coverage Score (0-100)

`43 / 100`

Verdict: **mixed, overall weak for high-risk business flows**.
## Score Rationale

### Tests Check
- Success paths: present but narrow (health/auth basic/list endpoints).
- Failure paths: present (auth failures, forbidden checks, invalid filters).
- Edge cases: limited depth (few seeded-state transitions).
- Validation: partial (offerings status, auth rejection, idempotency-header requirement check).
- Auth/permissions: partial (many tests stop at guard denial; few owner/admin matrix tests with real seeded resources).
- Integration boundaries: weak for content lifecycle, admin operations, and end-to-end enrollment approval flows.
- Assertion depth: mixed; several tests are still shallow status-only.
- `run_tests.sh`: **Docker-based and pinned image** (`node:20-bookworm-slim`) with Docker requirement check; this is compliant with containerized test execution.
- Low endpoint coverage: `28.8%`
- True no-mock HTTP coverage equals overall HTTP coverage, which is positive, but breadth is poor.
- Service-level backend unit coverage exists, but several important services/controllers are untested.
- Multiple unit test files are low-value pseudo-tests that do not exercise production logic.
- API observability and assertion depth are inconsistent.
- Entire high-risk modules, especially `content-assets`, are uncovered at the HTTP layer.

### Test Coverage Score (0–100)
**34 / 100**
## Key Gaps

### Score Rationale
- Large endpoint surface uncovered at HTTP level (36/52 with no HTTP request evidence).
- Strict true handler-path HTTP coverage only ~21%.
- API tests are true no-mock, but many high-risk flows remain untested.
- Unit suite size is good, but HTTP contract coverage is insufficient for acceptance-level confidence.
- Critical: `content-assets` exposes 12 endpoints and has zero exact-path HTTP coverage.
- Critical: no HTTP tests for `POST /enrollments/confirm`, `POST /enrollments/:id/approve`, or `POST /enrollments/:id/confirm-approved`.
- Critical: admin user-management endpoints are entirely uncovered.
- High: tag endpoints are entirely uncovered.
- High: `GET /api/v1/reservations/:id` is not reliably covered because the only request is behind a conditional branch.
- High: `AuthService`, `UsersService`, `ReservationsService`, `FilesService`, `RolesGuard`, and job handlers lack direct unit coverage.
- Medium: API tests do not mirror the full production interceptor stack from `main.ts`.
- Medium: several tests assert status-only behavior and provide weak request/response observability.

### Key Gaps
- No API tests for most `content-assets` routes, all `tags` routes, and all `admin/users` routes.
- Missing tests for auth endpoints: logout/change-password/reset-password.
- No API coverage for enrollments approval/confirm-approved transitions.
- Guard-only checks counted in several places instead of business-handler assertions.
- Reservation/enrollment ownership tests rely heavily on fake IDs and conditional branches.
## Confidence & Assumptions

### Confidence & Assumptions
- Confidence: **high for static endpoint/test inventory**, **medium for handler-reach certainty** where tests use only failure statuses.
- Confidence: `high`
- Assumptions:
  - Nest route resolution follows controller decorators shown in source.
  - Guard-only failures are not counted as strict handler coverage.
  - Conditional request blocks (`if (...)`) are treated as weak evidence.
  - Endpoint inventory is derived from controller decorators plus the global `api/v1` prefix in `repo/src/main.ts`.
  - Conditional test branches were treated as uncovered unless static inspection showed the exact request is always sent.
  - No frontend code was detected in the scoped file inventory, so frontend testing requirements for `web` / `fullstack` projects were not applied.
  - The audit did not assume runtime behavior beyond what is visible in source.

### Test Coverage Final Verdict
**PARTIAL PASS (strict mode)**  
Reason: true no-mock API tests exist, but endpoint and critical-flow coverage remain substantially insufficient.
# README Audit

---
## README Presence

## 2) README Audit
- README exists at required path: `repo/README.md`

Audited file: `repo/README.md`
## Hard Gate Failures

### Hard Gate Evaluation
1. Project type declaration missing at top.
   - Required declaration set: `backend`, `fullstack`, `web`, `android`, `ios`, or `desktop`
   - Actual top of README: `# Meridian Learning Content & Enrollment Management System`
   - Evidence: `repo/README.md:1-5`

1. **Formatting quality**  
- Status: **PASS**  
- Evidence: structured markdown with headings, tables, and command blocks.
2. Required backend startup string `docker-compose up` is missing.
   - README uses `docker compose up --build -d` instead.
   - Strict gate requires `docker-compose up`.
   - Evidence: `repo/README.md:47-59`, `repo/README.md:75-80`

2. **Startup instructions (backend/fullstack must include `docker-compose up`)**  
- Status: **FAIL**  
- Evidence: README uses `docker compose up --build -d` (`repo/README.md`), but strict gate requires explicit `docker-compose up` string.
3. Environment rules violated by host-side package-manager instruction.
   - README explicitly instructs host debugging after `npm ci`.
   - Strict rule disallows runtime installs / package-manager setup outside Docker-contained flow.
   - Evidence: `repo/README.md:109`

3. **Access method (URL + port for backend/web)**  
- Status: **PASS**  
- Evidence: `curl http://localhost:3000/api/v1/health` in Quick Start.
4. Demo credentials missing despite authentication being present.
   - Auth endpoints exist: `repo/src/auth/auth.controller.ts:82-149`
   - README does not provide username/email, password, or roles.
   - README also does not state `No authentication required`.
   - Evidence: README has no credentials section across `repo/README.md:1-155`

4. **Verification method**  
- Status: **PASS**  
- Evidence: health check command provided; test section provides execution commands.
## High Priority Issues

5. **Environment rules (no runtime installs/manual setup outside Docker)**  
- Status: **FAIL**  
- Evidence: README includes host-debugging instruction: "after `npm ci` you can run `npx jest ...`" (non-Docker local dependency path).
- Startup instructions are close but do not meet the exact strict requirement because they omit `docker-compose up`: `repo/README.md:55`, `repo/README.md:78`
- README omits any demo credentials or role matrix even though the API enforces auth and role checks: `repo/src/auth/auth.controller.ts:82-149`, `repo/src/users/admin.controller.ts:28-83`, `repo/src/audit/audit.controller.ts:6-40`
- Host-side `npm ci` guidance undermines the "everything Docker-contained" rule: `repo/README.md:109`

6. **Demo credentials (required when auth exists)**  
- Status: **FAIL**  
- Evidence:
  - Auth exists in code (`repo/src/auth/auth.controller.ts` with register/login/reset/change-password/logout).
  - README does not provide demo username/password/roles and does not state "No authentication required."
## Medium Priority Issues

### Engineering Quality Assessment
- README does not explicitly label the project type at the top even though the document clearly describes a backend service: `repo/README.md:1-5`
- Verification guidance is limited to a health-check curl. It does not show a fuller workflow for auth, content, or enrollment flows: `repo/README.md:54-58`
- Access guidance gives the API URL implicitly via curl, but there is no dedicated "Access" section that summarizes base URL and expected auth method: `repo/README.md:54-58`

- Tech stack clarity: **good** (`Node/Nest/TypeORM/PostgreSQL` clearly listed).
- Architecture explanation: **good** (module list + architecture diagram).
- Testing instructions: **moderate** (dockerized path clear; optional host path violates strict environment gate).
- Security/roles documentation: **partial** (security notes exist, but role-specific demo credentials absent).
- Workflow clarity: **moderate** (startup/verify clear; acceptance-operator credentials missing).
- Presentation quality: **good**.
## Low Priority Issues

### High Priority Issues
- Missing required demo credentials for auth-enabled system (all roles absent).
- Strict startup gate mismatch: explicit `docker-compose up` command not present.
- README includes non-Docker host test path (`npm ci` + local `npx jest`), violating strict environment rule.
- README is dense and documentation-first, but it would benefit from a compact "Roles / Demo Accounts" section near Quick Start.
- Testing guidance is otherwise strong and clearly explains the Docker-based runner: `repo/README.md:96-109`
- Architecture, stack, security notes, and known limitations are well documented: `repo/README.md:17-45`, `repo/README.md:111-155`

### Medium Priority Issues
- No role-to-endpoint quick matrix for operators/reviewers.
- Verification section is mostly health-level; limited business-flow verification examples.
## Engineering Quality

### Low Priority Issues
- Project type keyword (`backend`) not explicitly declared at top as required by strict detector.
- Formatting: pass. Markdown is clean, readable, and sectioned well.
- Tech stack clarity: strong. Stack table and module list are explicit: `repo/README.md:34-45`
- Architecture explanation: strong. Architecture diagram and module summary are present: `repo/README.md:17-34`
- Testing instructions: good but non-compliant with strict environment rules because of `npm ci` guidance: `repo/README.md:96-109`
- Security / roles explanation: partial. Security controls are described, but usable credential/role onboarding is missing: `repo/README.md:127-137`
- Workflow clarity: partial. Health-check verification exists, but end-user operational flows are under-documented.
- Presentation quality: good.

### Hard Gate Failures
- Startup command strict string gate: **FAILED**
- Environment rules strict Docker-only gate: **FAILED**
- Demo credentials gate (auth conditional): **FAILED**
## README Verdict

### README Verdict
**FAIL**
`FAIL`

Reason: multiple hard-gate failures under strict mode despite otherwise strong structural/documentation quality.
## README Rationale

---
- The README fails multiple hard gates.
- The document is otherwise technically informative and well structured.
- The failures are compliance failures, not formatting failures.

## Final Combined Determination
# Final Verdicts

- **Test Coverage Audit Verdict:** PARTIAL PASS
- **README Audit Verdict:** FAIL
- Test Coverage Audit verdict: `FAIL`
- README Audit verdict: `FAIL`

Overall strict-mode outcome: **NOT ACCEPTABLE for submission without remediation**, primarily due to README hard-gate violations and low true API endpoint coverage.