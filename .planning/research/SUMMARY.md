# Project Research Summary

**Project:** EAMS - Enterprise Asset Management System
**Domain:** Enterprise Asset Management (security hardening of an existing brownfield Next.js 16 + Prisma/PostgreSQL app — **not** a greenfield build)
**Researched:** 2026-08-10
**Confidence:** MEDIUM-HIGH (see Confidence Assessment)

## Executive Summary

This milestone hardens an **existing, shipping** EAMS (Next.js 16 App Router, Prisma/PostgreSQL, JWT-httpOnly-cookie auth, 5-role hierarchy SUPER_ADMIN→EMPLOYEE). It is not a build-from-scratch exercise: the app's structure (REST-first + BAST server actions + proxy.ts auth gate) is sound, but three systemic failings make it production-unsafe today — (1) **auth primitives that can be forged or bypassed** (hardcoded `JWT_SECRET` fallback + public registration that accepts a client-supplied `role`, together = anonymous SUPER_ADMIN with zero credentials), (2) **authorization enforced at only 2 of ~15 endpoints** and proxy-only in the rest (any logged-in user can approve their own BAST, dispose assets, rewrite any BAST field via mass-assignment), and (3) **uploads served from `public/`** (SVG/HTML = stored XSS on the app origin; no size cap = disk-fill DoS). Zero tests exist, which is how two live 500-bugs (`user.id` vs `user.userId`) shipped.

The recommended approach, agreed across all four research files, is **defense-in-depth with a single enforcement point**: (a) fail-fast environment assertions and hardened JWT verification (pin `iss`/`aud`/`alg`, add `jti` + `tokenVersion`), (b) one `requireRole()`/`requireUser()` choke point (`lib/security.ts`) called by every route handler, every server action, and the service layer — proxy.ts stays an optimistic pre-filter only, never the authorization gate, (c) all BAST business logic consolidated into one `lib/services/bast-service.ts` (today there are 3 divergent implementations), with atomic in-transaction numbering and strict zod allow-list schemas replacing body spreads, and (d) a three-tier test suite (Vitest unit + real-test-DB integration + Playwright E2E on a production build), written alongside the fixes, not after.

Key risks and mitigations: total session forgery (JWT fail-fast, first change in the milestone), privilege escalation (always-EMPLOYEE registration, role-guard on every mutation), stored XSS (uploads moved outside `public/` + magic bytes + SVG rejection + authenticated serving), and silent behavior divergence between REST and server-action BAST paths (single service layer + a REST-vs-action invariant test). All four files converge on the same dependency order: auth foundation → service consolidation → numbering/transaction hygiene → authorization rollout → uploads → test completion. The BAST service consolidation (BUG-02) is the keystone — the other critical fixes either unblock it or land cleanly on top of it.

## Key Findings

### Recommended Stack

Stay on the installed stack; bump and add, don't replace. Full detail: [STACK.md](./STACK.md).

**Core technologies:**
- **Next.js 16.3.x (installed)** — keep. Next 16 renamed `middleware.ts` → `proxy.ts`; page/route checks do NOT cover server actions, so every action must self-authorize. Proxy stays defense-in-depth.
- **jose ^6.2.8 (installed, bump ^6.1.3→)** — JWT sign/verify. HS256 is acceptable for a single-issuer app IF the secret is ≥32 bytes and `issuer`/`audience`/`algorithms` are pinned on verify. RS256/JWKS only warranted if multiple verifiers appear.
- **Prisma 6.19.x + PostgreSQL (installed)** — **do NOT take Prisma 7** in a hardening milestone (generator/client layout change = unacceptable bundling risk). **Align CLI (6.19.3) and client (6.19.0) versions now.** Interactive `$transaction` + `$queryRaw` tagged templates for atomic numbering.
- **bcryptjs ^3.0.3 (installed, keep)** — 12-round hashes already in the DB; swapping to argon2 invalidates every stored password; defer any hash migration.
- **zod ^4.4.3 (installed, bump ^4.3.6→)** — the fix for both mass assignment (CWE-915) and unvalidated pagination. One `.strict()` schema per endpoint; never spread `req.body` into Prisma `data`.
- **file-type ^22 + sharp ^0.35 (new)** — magic-byte MIME detection and re-encode for uploads (SEC-04); serve authority is bytes, not client `Content-Type`.
- **Vitest ^4.1 + vitest-mock-extended ^5.1 + supertest ^7.2 (new dev)** — unit/integration for the auth+RBAC matrix; pick Vitest over Jest (ESM + TS native; Prisma's 2026 testing series is written against Vitest 4).
- **@playwright/test ^1.62.1 (new dev)** — E2E against `next build && next start` on a dedicated test DB; `storageState` to log in once per role.

**Explicitly NOT to use:** `jsonwebtoken` (legacy, jose already installed), hardcoded `JWT_SECRET` fallback (fail-fast instead), `public/uploads/` for user files, body-spread into Prisma, `$executeRawUnsafe` seeds, `count()+1` numbering, NextAuth/Auth.js, Helmet (Next manages headers via `next.config.ts`), localStorage JWTs.

### Expected Features

Full landscape and matrix: [FEATURES.md](./FEATURES.md). All P1 items map to live CRITICAL/HIGH findings in `.planning/codebase/CONCERNS.md`.

**Must have (table stakes):**
- JWT secret fail-fast at startup (SEC-01) + issuer/audience/jti pinning — prerequisite for every other fix
- Registration always creates EMPLOYEE; client-supplied `role` stripped (SEC-02) — kills the privilege-escalation vector
- `requireRole()` on every mutation endpoint AND server action, consistent 401 vs 403 (SEC-03)
- Deny-by-default `proxy.ts` matcher + layout redirect (SEC-03b)
- `user.userId` fix + typed `assertUser()` (BUG-01) — unblocks BAST correctness
- Upload hardening: MIME allowlist + magic bytes + 5 MB cap + storage outside `public/` + authenticated serve route with `nosniff` (SEC-04); **reject `image/svg+xml` outright**
- BAST single service layer with typed transitions (BUG-02), atomic numbering (BUG-03), separation of duties (creator can't approve own BAST), `approverId` recorded
- Vitest auth/RBAC matrix + BAST workflow suites (TEST-01)

**Should have (differentiators, v1.x):**
- Role × resource × action permission matrix as a documented source of truth (`can(role, resource, action)`)
- Server-driven `available_actions` for BAST UI (UI can never show an action the backend rejects)
- AuditLog wiring for BAST transitions + denied attempts — **only after** BUG-02 consolidation
- Playwright E2E auth + BAST journey; sharp re-encode to strip EXIF/polyglots

**Defer (v2+, anti-features for this milestone):**
- DB-backed permission engine (5 fixed hierarchical roles don't warrant junction tables)
- Email/SMS admin-invite flow (no notification infra; conflicts with always-EMPLOYEE registration — ship the latter)
- Object storage/S3 migration (keep `lib/storage.ts` seam instead)
- ClamAV scanning and SVG sanitization pipelines (allowlist + re-encode covers the real vectors)
- Role logic inside proxy.ts; client-side gating as security boundary; AuditLog before consolidation — all explicitly rejected

### Architecture Approach

The target architecture keeps the three existing entry points (pages, REST handlers, server actions) but **extracts every business rule into a server-only service layer** — route handlers and actions become thin adapters (parse → guard → validate → delegate → translate). Full detail: [ARCHITECTURE.md](./ARCHITECTURE.md).

**Major components:**
1. **`lib/services/*` (star of the show)** — single source of truth for BAST transitions per `BastType`, asset custody, numbering. Owns `$transaction`. `bast-service.ts`, `asset-service.ts`, `auth-service.ts`, `maintenance-service.ts`
2. **`lib/security.ts`** — the one authz choke point: `requireUser()` (401) / `requireRole(min)` (403) returning typed `{ userId, email, role, fullName }`
3. **`lib/auth.ts` (hardened)** — jose JWT pinned iss/aud/alg/jti, bcrypt, cookie helpers, role hierarchy; `tokenVersion` check for revocation; no index signature (so `user.id` bugs die at compile time)
4. **`proxy.ts` (optimistic only)** — deny-by-default matcher; JWT presence/validity check, 401 JSON for `/api/*`, redirect for pages; never role decisions, never DB
5. **`lib/numbering.ts`** — `nextBastNumber(tx, year, month, type)` via counter row + `SELECT … FOR UPDATE` inside the create transaction (Prisma has no raw FOR UPDATE — `$queryRaw` required)
6. **`lib/validation/*`** — zod schemas per resource bound to `Prisma.*WhereInput`; pagination clamp (`z.coerce.number()`, max 100)
7. **`lib/storage.ts` + private file serve route** — sniff/cap/write to `<root>/uploads/assets/` (outside `public/`), authz-gated `GET` with path-traversal guard, validated `Content-Type`/`Content-Disposition`, `nosniff`; S3 becomes a seam-swap later

**Key patterns:** service-layer consolidation (proven 2026 consensus for server-actions-vs-route-handlers), defense-in-depth authz (proxy optimistic → handler/action authoritative → service re-checks ownership/IDOR), atomic counter-row numbering, layered test architecture (deep-mock units + NTARH integration + Playwright E2E), uploads-outside-`public/` with authz-gated serving. Data flow for BAST approve is now single-path: both REST and actions call the same `approveBast()`.

### Critical Pitfalls

Top 5 of 15 documented with prevention: [PITFALLS.md](./PITFALLS.md).

1. **Hardcoded JWT secret fallback** — `JWT_SECRET || "your-secret-key-change-this-in-production"` lets anyone forge SUPER_ADMIN (CRITICAL). *Prevent:* fail-fast throw at startup; pin `algorithms: ['HS256']`; first unit test asserts missing env throws.
2. **Open registration trusting client-supplied role** — anonymous `POST /api/auth/register` with `role: "SUPER_ADMIN"` = instant compromise (CRITICAL). *Prevent:* never read role from body; hard-set EMPLOYEE; test "register with SUPER_ADMIN → stored EMPLOYEE".
3. **Authorization only in middleware/proxy** — bypassable by design (CVE-2025-29927 class; matcher allow-list drift already exposes `/assets`, `/bast`, `/api/dashboard`). *Prevent:* proxy = optimistic cookie check only; every handler/action calls `requireRole()`; services re-check ownership; invert matcher to deny-by-default.
4. **Mass assignment via `{ ...body }` spread into Prisma data** — `PATCH /api/bast/[id]` lets any caller set `status: "APPROVED"` or rewrite `bastNumber` (HIGH). *Prevent:* zod `.strict()` allow-lists per endpoint; construct `data` from parsed fields only; return generic errors (stop leaking `error.message`).
5. **Uploads served from `public/` unvalidated** — SVG/HTML = stored XSS on the app origin, no size cap = disk DoS (HIGH). *Prevent:* magic bytes (file-type) + jpeg/png/webp allowlist (reject SVG) + 5 MB cap + store in non-`public` dir + authz-gated serve route with `nosniff`/`attachment`.

Also critical to the phase plan: **duplicated BAST logic across REST and server actions** (security fix applied to one path silently misses the other — consolidation must precede service-layer enforcement), **no token revocation** (7-day JWT survives logout/compromise → `tokenVersion`), **racy `count()+1` numbering**, and the testing trio (**mocking Prisma wrong** → assert calls not behavior; **redirect mocks that don't throw** → false positives; **E2E on dev server/shared state** → CI flakiness).

## Implications for Roadmap

Suggested **5 phases**, dependency-ordered. This sequence is forced by the research: every path leads out of `lib/auth.ts` and `lib/security.ts` (Phase 1), through the BAST service keystone (Phase 2), and only then can numbering, roles, and tests be done *once*. Uploads and E2E are the most parallelizable (both can start as soon as Phase 1 lands); the failure mode to avoid is building tests only at the end (they're written alongside each phase).

### Phase 1: Security Foundation — Auth, Registration & Typed Identity
**Rationale:** Everything depends on trustworthy sessions: the role guard reads `getCurrentUser()`, and a forged token defeats any guard. It is also the cheapest set of changes (fail-fast + strip role + typed helper kill the two CRITICAL findings immediately).
**Delivers:** `JWT_SECRET` fail-fast + verified issuer/audience/`algorithms`/`jti` on jose; `tokenVersion` on User (password change → old token 401); register always-EMPLOYEE (role stripped); `user.userId` fix + typed `assertUser()`/`getUserIdentity()` (index signature removed); zod validation lib + pagination clamps; Vitest infra + setup files (redirect mock **throws**, async `next/headers` mocks, `mockDeep<PrismaClient>`); first unit tests (missing env throws, wrong-iss/aud rejected, register-with-SUPER_ADMIN → EMPLOYEE, deny-by-default proxy matcher + `/assets` redirect for anonymous).
**Addresses:** SEC-01, SEC-02, BUG-01, SEC-03b (proxy), validation half of SEC-03, TEST-01 (foundations).
**Avoids:** Pitfalls 1, 2, 3, 4 (proxy half), 5, 7 (schema half), 11, 12, 13 (test-foundation half), 14 (proxy-rename cleanup starts here).

### Phase 2: BAST Consolidation & Authorization Rollout
**Rationale:** BUG-02 is the keystone: numbering (BUG-03), separation-of-duties, audit wiring, and service-layer role enforcement all live in the same transition logic, and the current three divergent implementations would repeat every fix three times. Pairing it with SEC-03 means there is exactly one enforcement point (the pitfall explicitly warns against adding role checks to one path only).
**Delivers:** `lib/services/bast-service.ts` (typed transitions per `BastType`, `approverId: actor.userId`, separation-of-duties: creator cannot approve own BAST — 409/403); REST handlers + server actions shrink to thin adapters (parse → guard → zod → service → `revalidatePath`); mass-assignment `PATCH /api/bast/[id]` removed/reduced to strict allow-list; `requireRole()` applied to every mutating endpoint + action per the role matrix; consistent 401/403 JSON; generic error responses (no `error.message` leak); REST-vs-action identical-outcome invariant test.
**Addresses:** BUG-02, SEC-03 (the largest security fix), separation of duties.
**Avoids:** Pitfalls 6, 7, 15 (root cause), 4 (handler/action half).
**Research flag:** **Medium.** The BAST state-machine rules are project-specific — planning needs to audit the three existing implementations in `app/api/bast/**` and `lib/actions/bast-actions.ts` to extract the legal transition table per `BastType` before writing the service. Patterns themselves are standard (skip deep research).

### Phase 3: Atomic Numbering & Transaction Hygiene
**Rationale:** Numbering must live inside the service's create transaction (Phase 2), and the counter-row/`FOR UPDATE` approach has a deliberate serialization cost that only makes sense once there is one call site. Runs with the seed rewrite (same `$transaction`/`$queryRaw` hygiene).
**Delivers:** `BastSequence` model + migration; `lib/numbering.ts` (`nextBastNumber(tx, …)` with `$queryRaw` `FOR UPDATE` + `RETURNING`); single shared numbering fn for RETURN/ASSIGNMENT/MAINTENANCE; unique index on `bastNumber` kept as backstop; idempotent upsert-based seed (raw-SQL `TRUNCATE … CASCADE` removed); concurrency test (12 parallel creates → 12 unique numbers, zero 500s); P2034 retry where Serializable is used (BAST approve + asset transfer).
**Addresses:** BUG-03, seed hardening (CONCERNS tech debt).
**Avoids:** Pitfalls 8, 9.
**Research flag:** **Low.** Prisma interactive transactions and FOR UPDATE counters are official-doc-verified. One open product question: confirm whether gapless numbering is a hard business rule (research recommends sequence + unique with gaps unless legally required — validate with stakeholder during planning).

### Phase 4: Secure Uploads
**Rationale:** Independent of the BAST stack; can start as soon as Phase 1 auth exists. The storage move (outside `public/`) is the actual fix; magic-byte validation is the gate in front of it — validating while writing to `public/uploads/assets/` leaves the XSS hole open.
**Delivers:** `lib/storage.ts` seam (sniff → cap → write to `<root>/uploads/assets/`, random server-generated filenames); magic-byte allowlist `jpeg|png|webp` via file-type (SVG rejected), 5 MB cap → 413; role-gated upload endpoint (STAFF_ASSET min); private authz-gated serve route (`app/uploads/[...path]/route.ts`) with path-traversal guard + validated `Content-Type` + `Content-Disposition` + `nosniff` + ETag/304; `imagePath` DB values re-pointed; upload tests (svg rejected, >5MB → 413, anonymous/employee → 401/403, not reachable at static URL).
**Addresses:** SEC-04.
**Avoids:** Pitfall 10.
**Research flag:** **None (standard).** OWASP + file-type/sharp patterns are well-documented; sharp **re-encode** is explicitly a P3 differentiator — do not pull it into this phase.

### Phase 5: Test Completion & Closing Hardening Tasks
**Rationale:** Phase 1 bootstrapped the Vitest infra; this phase finishes the coverage mandate (TEST-01) now that the service layer exists to target, and sweeps the residual LOW/MEDIUM findings that the earlier phases either introduced awareness of or couldn't reach.
**Delivers:** Full auth/RBAC matrix suite (four-branch: anonymous/invalid/wrong-owner/insufficient-role + happy path per mutation); BAST workflow suite (legal transitions record approver; illegal transitions write zero rows); Playwright E2E on `next build && next start` (login → register-EMPLOYEE → admin mutation → 403; BAST create → approve → custody update; upload) with `storageState` per role, isolated contexts, test DB (never dev/prod); docs pass (grep `middleware.ts` references; align `eslint-config-next` 16.1.6 → 16.3.x); demo-credentials cleanup (login form hint + reset scripts behind env); CSV formula-injection escaping; AuditLog wiring (P2 differentiator) as stretch.
**Addresses:** TEST-01 completion, remaining CONCERNS LOW/MEDIUM items, differentiator "AuditLog wiring".
**Avoids:** Pitfalls 11, 12, 13 (completed), 14 (docs half).
**Research flag:** **Medium-low.** Testing patterns are well-documented 2026 consensus; the finicky bits (next-test-api-route-handler must be first import; Playwright `webServer` against production build) are tooling specifics best resolved in a planning-phase spike rather than full research.

### Phase Ordering Rationale

- **Dependency-driven:** `lib/auth.ts`/`lib/security.ts` (P1) → BAST service keystone (P2) → numbering inside that service (P3) → authz-gated uploads on top of P1 (P4) → full test suites targeting the consolidated service (P5). The guard needs a fail-fast secret; numbering needs one call site; service-layer role enforcement needs one service.
- **Risk-priority:** the two CRITICAL findings (JWT forgery + register-as-admin) and the largest HIGH (missing role checks) are closed in Phases 1–2, before any BAST correctness or test work — matching FEATURES P1 prioritization and PITFALLS' phase mapping (SEC-01/02 in Phase 1, BUG-02/03 in Phase 2, TEST-01 in Phase 3 of their numbering).
- **Consolidation-first, not parallel:** deliberately avoiding the trap of adding role checks / audit writes to the existing divergent REST+action BAST paths — consolidation (P2) precedes those (P2 service enforcement, P5 audit).
- **Tests alongside, not after:** Vitest infra ships in P1 and each phase adds its own tests; P5 only finishes the remaining matrix/E2E coverage. Zero tests is the root cause of the shipped bugs — never repeat it.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** BAST transition rules per `BastType` must be extracted from the three divergent in-codebase implementations — project-specific, requires reading `app/api/bast/**` and `lib/actions/bast-actions.ts` during `gsd-plan-phase`.
- **Phase 5:** NTARH route-handler integration setup (first-import constraint, cookie/params emulation) and Playwright `webServer` prod-build harness — tooling specifics warrant a planning spike.
- **Phase 3 (product question, not research):** confirm gapless-vs-gapped BAST numbering is not a legal business requirement; if gapless is mandated, the counter-row serialization decision changes. Validate with the stakeholder during requirements/planning.

Phases with standard patterns (skip research-phase):
- **Phase 1:** JWT fail-fast + iss/aud/alg pinning, registration role stripping, deny-by-default proxy — all official-doc/OWASP-verified.
- **Phase 4:** OWASP file-upload hardening + file-type/sharp usage — well-documented; no research-phase needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against npm registry 2026-08-10 (next 16.3.0, prisma 7.9.1, jose 6.2.8, vitest 4.1.10, file-type 22.0.1, sharp 0.35.3, zod 4.4.3); patterns cross-checked against official docs + OWASP |
| Features | HIGH | Cross-checked against official docs + multiple 2026 sources; every P1 maps to a live finding in `.planning/codebase/CONCERNS.md` (direct code evidence) |
| Architecture | MEDIUM | Core patterns (service layer, defense-in-depth authz, atomic numbering, private uploads) official-doc-verified; ecosystem/test-tooling specifics from 2026 practitioner consensus (multiple agreeing sources, not single-authority) |
| Pitfalls | MEDIUM | Every pitfall cross-referenced to in-repo code lines (HIGH ground truth); prevention patterns from mixed official + practitioner + vendor-blog sources |

**Overall confidence:** MEDIUM-HIGH — the security-critical findings and phase ordering are grounded in direct codebase evidence and official docs (HIGH); the areas of residual uncertainty are ecosystem/tooling specifics and 2026 practitioner consensus claims (MEDIUM).

### Gaps to Address

- **Gapless BAST numbering requirement:** STACK and PITFALLS disagree in emphasis (STACK raises gapless as a business-rule variant; PITFALLS asserts "uniqueness is the requirement"). Resolve with the stakeholder during planning; research default is sequence + unique index (gaps acceptable).
- **`tokenVersion` scope:** which events increment it (password change, logout-all, role demotion) is a product decision; research recommends the minimum viable version check. Deferred full session table stays flagged.
- **Sharp re-encode timing:** deliberately deferred to P3 (FEATURES) / not in Phase 4 scope; validate that asset photos never need SVG before rejecting it permanently.
- **Admin-invite flow:** documented design only (needs email/SMS infra that doesn't exist). Always-EMPLOYEE registration ships; invite replaces it when a provider appears.
- **Deployment target undecided:** local FS + private `uploads/` dir with the `lib/storage.ts` seam is correct until Vercel/lambda-style deploy is real (then S3/R2 is a seam-swap). Persistent volume requirement at deploy must be flagged in the plan.
- **CSV formula injection & demo-credentials cleanup:** flagged across research (MEDIUM findings) but not in the active requirements list — decide whether to fold into Phase 5 or backlog.
- **PITFALLS vs ARCHITECTURE phase numbering differs** (PITFALLS uses 3 phases, ARCHITECTURE lists 6 build-order steps); this synthesis resolves to 5 phases. The *order of work* is identical in both — only the grouping differs; regrouping during roadmap creation is safe as long as the dependency chain (auth → service → numbering → roles/rollout → uploads → tests) is preserved.

## Sources

### Primary (HIGH confidence)
- Context7 `/panva/jose` — SignJWT/jwtVerify iss/aud/alg pinning, HMAC key-length enforcement
- Context7 `/vercel/next.js` (v16) — proxy.ts rename, data-security.mdx (server actions re-verify auth), server-actions CSRF, testing/vitest
- Context7 `/prisma/web` (transactions) + Prisma testing series (Jul 2026) — interactive `$transaction`, P2034 retry, mockDeep pattern, Vitest-4 rationale
- OWASP File Upload Cheat Sheet; OWASP Mass Assignment Cheat Sheet — allowlists, magic bytes, store outside webroot, SVG/HTML XSS, DTO prevention
- npm registry `npm view` 2026-08-10 — exact current versions
- Project ground truth: `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`, `lib/auth.ts`, `proxy.ts`, `app/api/bast/**` (direct code evidence for every live bug/finding)

### Secondary (MEDIUM confidence)
- Cybertec PostgreSQL "Sequences vs. Invoice numbers" — concurrency-safe document numbering
- RFC 9700 / OAuth 2.1 BCP summaries (2026) — short-lived access tokens, token-version revocation
- WorkOS/Auth0/cidaas/ScaiLabs registration & invite flows; 137Foundry RBAC guide — feature benchmarking
- CVE-2025-29927 middleware bypass analysis (Snyk, Faultline Security 2026) — why proxy-only auth fails
- 2026 practitioner consensus on server-actions-vs-route-handlers (pean.dev, frontendaccelerator, Paulund): shared service layer
- 2026 testing guides (codewithseb, iamraghuveer, devcheolu; next-test-api-route-handler) — Vitest/NTARH/Playwright split
- Vercel/Next.js docs + discussion #16417 — `public/` not for persisted storage, presigned-URL upgrade path

### Tertiary (LOW confidence)
- Vendor/practitioner blogs on gapless numbering specifics and file-upload hardening details — single-source claims, needs validation only where they drive decisions (none critical)

---
*Research completed: 2026-08-10*
*Ready for roadmap: yes*