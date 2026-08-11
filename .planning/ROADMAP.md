# Roadmap: EAMS — Security Hardening Milestone

## Overview

This milestone hardens the shipping EAMS application (Next.js 16 + Prisma/PostgreSQL) against the failures found in the codebase map — forgeable sessions, privilege escalation via public registration, authorization enforced at only 2 of ~15 mutation endpoints, mass-assignment through body spreads, and uploads served unvalidated from `public/` — and fixes the two live `user.id` vs `user.userId` bugs that shipped because the project has zero automated tests.

The journey runs in strict dependency order: trustworthy auth + typed identity first (Phase 1), then BAST service consolidation with role enforcement at every mutation (Phase 2), atomic numbering and transaction hygiene (Phase 3), secure upload handling (Phase 4), and production-build E2E verification plus closing tasks (Phase 5). Tests are written alongside each phase, never after — TEST-01 (Vitest infrastructure) lands in Phase 1 and every phase adds its own suite.

## Phases

- [x] **Phase 1: Security Foundation — Auth, Registration & Typed Identity** - Fail-fast JWT secret, pinned token verification, always-EMPLOYEE registration, typed identity, deny-by-default proxy, test infrastructure (completed 2026-08-11)
- [x] **Phase 2: BAST Consolidation & Authorization Rollout** - Single BAST service, role enforcement on every mutation, mass-assignment fix, generic errors (completed 2026-08-11)
- [x] **Phase 3: Atomic Numbering & Transaction Hygiene** - Race-free BAST numbers, idempotent seed, concurrency proof (completed 2026-08-11)
- [x] **Phase 4: Secure Uploads** - Magic-byte validation, 5 MB cap, storage outside `public/`, authenticated serving (completed 2026-08-11)
- [ ] **Phase 5: Test Completion & Closing Hardening Tasks** - Production-build E2E suite, full coverage mandate, residual closeout

## Phase Details

### Phase 1: Security Foundation — Auth, Registration & Typed Identity

**Goal**: Users get trustworthy sessions — the app fails fast without a JWT secret, tokens are verified with pinned issuer/audience/algorithm/jti and revocable via tokenVersion, self-registration can never elevate a role, and identity is typed so the `user.id` class of bug dies at compile. Vitest infrastructure and the first auth unit tests land here.
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, BUG-01, TEST-01, TEST-02, DATA-02
**Success Criteria** (what must be TRUE):

  1. The app refuses to start when `JWT_SECRET` is unset — startup fails fast with a clear error, and no hardcoded fallback secret exists anywhere in the codebase.
  2. Registering with `role: "SUPER_ADMIN"` in the request body creates a user whose stored role is EMPLOYEE — self-registration can never elevate privileges.
  3. Tokens with the wrong issuer, audience, or algorithm are rejected; changing a password or logout-all invalidates previously issued tokens (401).
  4. Unauthenticated users opening any protected route are redirected to `/login`, and direct calls to protected `/api/*` endpoints return 401 (deny-by-default proxy matcher).
  5. The Vitest suite runs and auth tests pass: missing env throws, wrong iss/aud rejected, register-with-SUPER_ADMIN stored as EMPLOYEE.

**Plans**: 3 plans
**UI hint**: yes

Plans:

- [x] 01-01-PLAN.md — Fail-fast env guard, tokenVersion schema, Prisma alignment, deny-by-default proxy gate
- [x] 01-02-PLAN.md — Typed identity, pinned tokens, registration role pin, revocation wiring, BUG-01 fixes
- [ ] 01-03-PLAN.md — Vitest infrastructure + auth unit tests

### Phase 2: BAST Consolidation & Authorization Rollout

**Goal**: All BAST business logic lives in one typed service with legal transitions per BastType and separation of duties, and every mutating endpoint/server action (assets, bast, maintenance, categories, locations, divisions) enforces roles through a single `requireUser()`/`requireRole()` choke point with generic error responses. This phase kills the largest HIGH finding (missing role checks) and the behavioral divergence between REST and server-action BAST paths.
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: BUG-02, BUG-04, BUG-05, SEC-06, SEC-07, SEC-08, SEC-09, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):

  1. Every mutating endpoint and server action returns 401 for anonymous callers and 403 for callers below the required role — no mutation is reachable without authorization.
  2. BAST create/approve/reject via REST and via server actions produce identical outcomes through the same service, with `approverId`/`approverName` recorded from the authenticated actor (`user.userId`).
  3. The creator of a BAST is rejected when attempting to approve or reject their own BAST (separation of duties), regardless of their role.
  4. `PATCH /api/bast/[id]` accepts only allow-listed fields via a strict zod schema; attempts to set `status`, `bastNumber`, or other non-editable fields are rejected instead of silently applied.
  5. Error responses returned to clients are generic — internal `error.message` content never leaks.

**Plans**: TBD

### Phase 3: Atomic Numbering & Transaction Hygiene

**Goal**: BAST numbers are generated atomically inside the create transaction (counter row + `SELECT ... FOR UPDATE`), with the unique index as backstop, and the destructive raw-SQL seed is replaced by an idempotent upsert-based seed. Runs directly on Phase 2's service layer so there is exactly one numbering call site.
**Mode**: mvp
**Depends on**: Phase 2
**Requirements**: BUG-03, DATA-01, TEST-06
**Success Criteria** (what must be TRUE):

  1. Creating 12 BASTs in parallel yields 12 unique numbers with zero 500s — duplicate-number conflicts are impossible even under concurrency.
  2. The seed script can be re-run repeatedly without destroying existing data (no `TRUNCATE ... CASCADE`) — dev/test databases reset safely by re-running seed.
  3. The concurrency test (12 parallel creates → 12 unique numbers, zero 500s) passes as part of the automated suite.

**Plans**: TBD

### Phase 4: Secure Uploads

**Goal**: Asset image uploads are validated by magic bytes with a jpeg|png|webp allowlist (SVG rejected), capped at 5 MB, stored outside `public/` under server-generated names, and served only through an authenticated route with path-traversal guards and validated headers. Closes the stored-XSS and disk-fill vectors.
**Mode**: mvp
**Depends on**: Phase 1 (auth foundation — schedulable in parallel with Phases 2–3; ordered after Phase 3)
**Requirements**: SEC-10, SEC-11, SEC-12, SEC-13, TEST-05
**Success Criteria** (what must be TRUE):

  1. Uploading an SVG or other non-allowlisted type is rejected; JPEG/PNG/WebP files with valid magic bytes are accepted.
  2. Uploads over 5 MB are rejected with 413; anonymous callers get 401 and callers below STAFF_ASSET get 403.
  3. Uploaded files are stored outside `public/` and are not reachable via any static URL — they load only through the authenticated serve route for authorized users.
  4. Path-traversal attempts against the serve route are blocked, and served responses carry validated `Content-Type`/`Content-Disposition` with `nosniff`.

**Plans**: TBD

### Phase 5: Test Completion & Closing Hardening Tasks

**Goal**: The milestone's test mandate is completed with a Playwright E2E suite running against a production build (`next build && next start`) on a dedicated test DB, and the residual LOW/MEDIUM hardening items surfaced during research are closed or explicitly deferred. This is the enforcement phase that makes the whole milestone verifiable end-to-end.
**Mode**: mvp
**Depends on**: Phases 1–4
**Requirements**: TEST-07
**Success Criteria** (what must be TRUE):

  1. The Playwright E2E suite passes against `next build && next start` on a dedicated test DB, covering: login, register-as-EMPLOYEE, an admin-gated mutation returning 403, and the full BAST journey (create → approve → custody update).
  2. Total coverage mandate is complete: the auth/RBAC matrix suite and the BAST workflow invariant suite (REST vs server actions) pass in CI alongside the unit suites from earlier phases.
  3. Residual hardening items flagged in research (stale `middleware.ts` docs references, demo credentials in login form, CSV formula-injection escaping, AuditLog wiring as stretch) are either closed or explicitly deferred with a reason in PROJECT.md.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Foundation — Auth, Registration & Typed Identity | 2/3 | Complete    | 2026-08-11 |
| 2. BAST Consolidation & Authorization Rollout | 1/1 | Complete    | 2026-08-11 |
| 3. Atomic Numbering & Transaction Hygiene | 1/1 | Complete    | 2026-08-11 |
| 4. Secure Uploads | 1/1 | Complete    | 2026-08-11 |
| 5. Test Completion & Closing Hardening Tasks | TBD | Not started | - |

---
*Roadmap created: 2026-08-10*
