# Feature Research

**Domain:** Enterprise Asset Management System (EAMS) — security hardening milestone
**Researched:** 2026-08-10
**Confidence:** HIGH (core patterns cross-checked against official docs + multiple 2026 sources)

## Feature Landscape

This milestone hardens an **existing** brownfield EAMS (Next.js 16 App Router + Prisma/PostgreSQL, JWT cookie auth, 5-role hierarchy SUPER_ADMIN→EMPLOYEE). The features below are behaviors that must exist for the app to be production-safe, mapped to the project's active requirements (SEC-01…04, BUG-01…03, TEST-01).

### Table Stakes (Users Expect These)

Security behaviors without which the system is not production-safe. Missing these = the 2 CRITICAL + 2 HIGH findings in `.planning/codebase/CONCERNS.md` stay live.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **RBAC: centralized role-guard helper on every mutation endpoint** (SEC-03) | Security expectation: anonymous user ≠ any-role user ≠ authorized user. Only `/api/users*` checks roles today; every other mutation is auth-only, so an EMPLOYEE can dispose assets, approve their own BAST, and rewrite any BAST field | MEDIUM | One `requireRole(user, minimumRole)` (or `assertUser()`) helper layered on existing `hasMinimumRole`/`ROLE_HIERARCHY` in `lib/auth.ts`. Applied to all POST/PATCH/DELETE in assets, bast, maintenance, categories, locations, divisions + `lib/actions/bast-actions.ts` server actions. Single choke point, no per-route copying |
| **RBAC: consistent 401 vs 403 semantics** | API consumers (and the audit trail) must be able to distinguish "not logged in" from "logged in but not allowed" | LOW | Per official Next.js auth guide: `verifySession()` fails → **401**; session valid but role insufficient → **403**. JSON body `{ success:false, error:"Forbidden" }` matching existing response shape. Current code returns bare 401 from middleware and diverges per-route |
| **RBAC: deny-by-default page & API protection** | Enterprise expectation that nav-hidden features are also unreachable; today `/assets`, `/bast`, `/reports`, `/api/dashboard` render for anonymous users | LOW | Invert `proxy.ts`: negative-lookahead matcher protecting all paths except explicit public list (`/login`, `/register`, `/api/auth/login`, `/api/auth/register`, static assets). Keep middleware as defense-in-depth — role authorization still lives in route handlers |
| **RBAC: never spread untrusted request body into Prisma `data`** | Mass-assignment defense: attacker can inject `status`, `creatorId`, `bastNumber` fields via `PATCH /api/bast/[id]` | MEDIUM | Field allowlisting (pick known fields with zod or explicit destructuring) before any Prisma `create`/`update`. Also fixes CONCERNS.md "divergent approval semantics" where PATCH bypasses state rules. Note: zod is already installed but unused |
| **Registration: client-supplied role ignored — account always created as EMPLOYEE** (SEC-02) | Critical expectation: an anonymous visitor cannot self-register as SUPER_ADMIN. Today `role` is read from the request body | LOW | Minimal correct fix given email infra is out of scope: strip `role` from the register payload entirely and hard-set `UserRole.EMPLOYEE`. Admin user management already exists for role promotion. Full admin-invite is a differentiator (deferred) |
| **Upload: MIME allowlist + magic-byte validation + size cap** (SEC-04) | Users expect uploaded "images" to actually be images; attackers expect any file-type pass-through (SVG/HTML = stored XSS on same origin, giant file = disk-fill DoS) | MEDIUM | `file-type` (magic bytes, first ~4100 bytes) is the truth; client `Content-Type` is a hint. Allowlist only `image/jpeg|png|webp` — **explicitly exclude `image/svg+xml`** (paywall to stored XSS). Cap 5 MB (project's own CONCERNS recommendation) → 413. Auth-required + role-gated (STAFF_ASSET minimum) |
| **Upload: store outside `public/`, serve via authenticated route** (SEC-04) | Next.js serves `public/` statically — `public/uploads/assets/` is the stored-XSS vector. Standard enterprise hardening: files outside webroot, served through an app route that enforces access control | MEDIUM | Storage dir `uploads/` (non-`public` — e.g. project root or env-configured path) + new `GET /api/assets/[id]/images/[file]` or similar serving route with `Content-Disposition: attachment` (or `inline` for validated images), `X-Content-Type-Options: nosniff`, Content-Type from validated MIME — never user-supplied. Update `imagePath` DB values |
| **BAST: fix `user.id` vs `user.userId`** (BUG-01) | Two live shipping bugs: BAST auto-return always 500s (`creatorId` undefined), approvals never record `approverId` | LOW | `JWTPayload` has `userId` (not `id`) + index signature hiding the bug. Use `user.userId`, drop the `as string` casts, add typed `assertUser()` returning `{ userId, email, role, fullName }` |
| **BAST: one service layer, typed transition rules** (BUG-02) | Users expect approval behavior to be identical regardless of UI path. Today REST and server-action BAST flows diverge (detail fields dropped, `MAINTENANCE_OUT` handled in only one path) | HIGH | Consolidate into `lib/services/bast-service.ts`; both API routes and server actions call it. State machine per `BastType` with explicit legal transitions (see Patterns). UI must not decide legality — the service is the gate |
| **BAST: unique numbering under concurrency** (BUG-03) | Two concurrent BAST creates must not collide on `bastNumber` (unique-constraint 500 today) | MEDIUM | Number generated **inside** the transaction that inserts the BAST: either Postgres `SEQUENCE` (unique, allows gaps — acceptable for BAST, no legal gapless requirement) or per-type/year counter row with `SELECT … FOR UPDATE`. Keep the DB unique index as the last line of defense. Single numbering function in the service so RETURN/ASSIGNMENT/MAINTENANCE share it |
| **BAST: separation of duties — creator cannot approve own BAST; asset transfer only on approval** | Core governance expectation for handover documents: the person handing over must not approve their own handover; custody change must be a side-effect of APPROVED, not PENDING or arbitrary PATCH | MEDIUM | In the approval transition: reject if `bast.creatorId === actor.userId` (409 or 403 — see Pitfalls), reject unless status is PENDING. Holder/location transfer + `MAINTENANCE_OUT` ticket happen only in the same APPROVED transition, atomically (interactive transaction) |
| **Tests: Vitest unit suite — auth + RBAC matrix** (TEST-01) | Zero tests allowed two CRITICAL bugs to ship. Test the matrix, not just happy path: anonymous→401, wrong-role→403, wrong-owner→404/denied, admin→200, per mutation resource | HIGH | See Patterns section. Server actions/route handlers as plain async functions with mocked `next/headers` (`cookies()`), `next/navigation` (`redirect()` mock **must throw**), mocked `getCurrentUser()` per role |
| **Tests: BAST workflow suite** (TEST-01) | Only tests catch "approval works via UI but not via API" class of divergence | HIGH | Legal transition succeeds + records approver; illegal transition rejected + **zero** state/audit writes; numbering concurrency test (two parallel creates → distinct numbers); separation-of-duties test |
| **JWT secret fail-fast at startup** (SEC-01) | Absolute baseline: no hardcoded fallback signing key. Today `|| "your-secret-key-change-this-in-production"` lets anyone forge a SUPER_ADMIN token | LOW | `if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required")`. Prerequisite for every auth test (tests need deterministic secret) |
| **Upload/auth error responses: no internal details leaked** | Standard OWASP/enterprise behavior: Prisma/driver internals in `error.message` responses today (LOW in CONCERNS) | LOW | Log full error server-side; return generic message. Pairs naturally with the role-guard helper cleanup |

### Differentiators (Competitive Advantage)

Beyond-baseline governance features that would set this EAMS apart for an enterprise/compliance audience. All align with the Core Value ("otorisasi peran yang aman di setiap langkah").

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Role × resource × action permission matrix as a single documented source of truth** | Makes the 5-role hierarchy auditable and reusable in tests, docs, and the UI. Beats scattered `hasMinimumRole` calls (CONCERNS: 200-file problem) | MEDIUM | Matrix table (roles × {assets, bast, maintenance, master-data, users} × {create, read, update, delete, approve}) + `can(role, resource, action)` helper. Existing hierarchy maps onto it; matrix becomes the test spec |
| **Server-driven `available_actions` for BAST UI** | UI can never show an approval button the backend will reject — kills the REST-vs-server-action divergence class permanently | MEDIUM | Service returns the action list the current user may take on a BAST given role + status; client renders only those. Proven pattern in 2026 approval-workflow references (openown-workflow) |
| **Audit trail wiring (AuditLog model) for BAST transitions + role denials** | Compliance: "who approved/rejected what, when, and who tried and was denied". The `AuditLog` model exists but is unused | MEDIUM | Write one audit row in the same transaction as each BAST transition; log authorization denials (cheap, high value). Deferred until after BAST consolidation per PROJECT.md — do NOT wire before BUG-02 |
| **Admin-invite registration flow** (SEC-02 evolved) | Enterprise-grade onboarding: admin issues invite, token expires, role assigned by admin not chosen by user | HIGH | Needs email/SMS infra which is explicitly out of scope today — design the flow, defer implementation. If/when a provider appears, replace always-EMPLOYEE register with invite+accept |
| **Playwright E2E: full auth + BAST journey against production build** | E2E catches integration truths unit tests can't: cookies through real browser, server-action form posts, redirect flows | HIGH | Run against `next build && next start` (not dev server — 2026 consensus). Login → register-EMPLOYEE → attempt admin mutation → expect 403/redirect; create BAST → approver approves → custody updates |
| **Image re-encode (sharp) to strip EXIF / neutralize polyglots** | Beyond magic bytes: polyglot images and EXIF metadata survive byte checks | MEDIUM | Optional v1.x: re-encode JPEG/PNG to a canonical raster. Also neutralizes decompression-bomb concerns if size-checked before decode |

### Anti-Features (Commonly Requested, Often Problematic)

Explicitly NOT to build in this milestone (scope creep that fights the actual work).

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full DB-backed permission engine (roles/permissions/role_permissions tables + per-user overrides)** | "Proper RBAC" with roles-as-data, custom roles, per-user grants | 5 fixed hierarchical roles already model the org; junction tables + recursive CTEs add a schema migration, admin UI, and a whole test surface for zero current business need (137Foundry: >8–10 roles is when to reconsider) | Flat matrix constant + `can(role, resource, action)` helper. Revisit only if cross-org tenancy or custom roles become a requirement |
| **Client-side role gating as the security boundary** | Cheap-feeling protection; already partially present (sidebar hides nav) | Cosmetic only; every API is directly reachable; users already know this failed us | Server-side enforce in route handlers + service layer; keep UI gating purely for UX |
| **Email/SMS invite notifications for admin-invite flow now** | Completes the invite UX | No provider, no SMTP config, no queue — massive new surface; PROJECT.md explicitly defers external notifications | Always-EMPLOYEE registration now; invite design documented, implemented with email later |
| **Object storage / S3 migration for uploads** | Cloud-scale file storage | Deployment target doesn't exist yet; local fs with volume is the constraint (PROJECT.md); moving to S3 now is rework when the deploy story lands | Store outside `public/` on local disk; the serving-route abstraction should be a thin adapter that S3 can slot into later |
| **ClamAV / virus scanning on uploads** | Defense-in-depth on files | Heavy infra for image-only uploads; magic bytes + re-encode covers the real XSS/DoS vectors for this file set | Magic-byte validation + optional sharp re-encode |
| **Custom SVG sanitization pipeline** | "SVGs can be safe if sanitized" | Sanitizing SVG XML (scripts, foreignObject, external refs) is a permanent whack-a-mole; our use case (asset photos) doesn't need SVG | Reject `image/svg+xml` outright at the allowlist |
| **Authorization checks inside `proxy.ts` (role logic in middleware)** | "Single place to check roles" | Middleware can't easily know record ownership; role decisions belong with the data (route/service layer), middleware re-runs on every asset and has edge cases (CONCERNS: prefix drift) | Middleware = auth-only 401/redirect; route/service = role + ownership |
| **Full AuditLog implementation before BAST consolidation** | "Finally use the unused model" | Wiring audit writes into two divergent BAST paths doubles the divergence problem and buries the real fix | Consolidate BAST first (BUG-02), then wire audit into the single service |

## Feature Dependencies

```
[Mutation role-guard (SEC-03)]
    └──requires──> [JWT secret fail-fast (SEC-01)]      # guard needs trustworthy session
    └──requires──> [deny-by-default proxy (SEC-03b)]    # defense-in-depth layering

[user.userId fix (BUG-01)]
    └──requires──> [typed assertUser() helper]
                       └──required by──> [BAST approval semantics]

[BAST single service layer (BUG-02)]
    ├──requires──> [user.userId fix (BUG-01)]           # approverId/creatorId must be correct
    └──then──> [BAST numbering fix (BUG-03)]            # numbering lives in the service
                  └──requires──> [unique index on bastNumber]  # DB backstop
    └──then──> [separation of duties rule]              # same transition table
    └──then──> [AuditLog wiring]                        # differentiator, after consolidation

[Upload validation (SEC-04)]
    ├──requires──> [storage outside public/]            # validation is pointless if files are statically served
    │                  └──requires──> [authenticated serving route + imagePath re-point]
    └──requires──> [magic-byte lib (file-type)]         # dependency
    └──enhances──> [image re-encode (sharp)]            # differentiator layer on top

[Registration always-EMPLOYEE (SEC-02)]
    ├──requires──> [JWT secret fail-fast]               # new accounts sign real tokens
    └──conflicts──> [admin-invite flow]                 # mutually exclusive UX — pick one, evolve later

[RBAC test suite (TEST-01)]
    └──requires──> [role-guard helper exposed for test] # importable pure functions (no `next/headers` at import time)
    └──requires──> [vitest + next/headers mocks]        # tooling
    └──requires──> [BAST service layer]                 # BAST tests target the service, not divergent routes
```

### Dependency Notes

- **[Mutation role-guard] requires [JWT secret fail-fast]:** the guard reads `getCurrentUser()`; a forged token defeats any guard, so the signing secret must be env-only first. It's also the cheapest change and unblocks everything above it.
- **[BAST service layer] is the keystone:** BUG-02 consolidation must precede BUG-03 (numbering) and separation-of-duties, because both live in the same transition logic. Building them into the divergent REST/action pair repeats the original mistake.
- **[Upload storage move] before/with validation:** validating magic bytes while continuing to write into `public/uploads/assets/` leaves the stored-XSS hole open. The storage+serve change is the actual fix; validation is the gate in front of it.
- **[Registration fix] conflicts with [admin-invite]:** do not build a half-invite (invite without email delivery). Ship always-EMPLOYEE now; evolve to invite when notification infra exists.

## MVP Definition

This is a **hardening milestone** on an existing app — "MVP" = the minimal correct security posture. Everything below maps to the active requirements and the CONCERNS findings.

### Launch With (v1)

- [x] JWT secret fail-fast (SEC-01) — prerequisite for every other security fix
- [x] Registration always-EMPLOYEE, role stripped from body (SEC-02) — kills CRITICAL privilege-escalation
- [x] Role-guard on all mutation endpoints + server actions, 401/403 semantics (SEC-03)
- [x] Deny-by-default proxy matcher (SEC-03b)
- [x] `user.userId` fix + `assertUser()` helper (BUG-01) — unblocks BAST correctness
- [x] Upload validation: MIME allowlist, magic bytes, 5 MB cap, storage outside `public/`, authenticated serving (SEC-04)
- [x] BAST single service layer with typed transitions (BUG-02)
- [x] BAST numbering inside transaction + unique-index backstop (BUG-03)
- [x] Separation of duties: creator cannot approve own BAST
- [x] Vitest auth+RBAC matrix suite + BAST workflow suite (TEST-01)

### Add After Validation (v1.x)

- [ ] Server-driven `available_actions` in BAST UI — once the service layer is stable, the UI consumes it; kills remaining divergence risk
- [ ] AuditLog wiring for BAST transitions + denied-attempt logging — after consolidation (per PROJECT.md ordering)
- [ ] Playwright E2E auth+BAST journey — once unit suites pass and flows stabilize
- [ ] Image re-encode (sharp) — after basic validation is proven
- [ ] Admin-invite flow — when an email/SMS provider exists

### Future Consideration (v2+)

- [ ] Object storage adapter (S3/R2) behind the serving-route abstraction — when deployment target is decided
- [ ] DB-permission engine with custom roles/per-user overrides — only if tenancy or custom roles become real
- [ ] Rate limiting on login/upload (CONCERNS MEDIUM) — already deferred per PROJECT.md

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| JWT secret fail-fast (SEC-01) | HIGH | LOW | P1 |
| Registration always-EMPLOYEE (SEC-02) | HIGH | LOW | P1 |
| Role-guard + 401/403 on all mutations (SEC-03) | HIGH | MEDIUM | P1 |
| Deny-by-default proxy (SEC-03b) | HIGH | LOW | P1 |
| `user.userId` fix (BUG-01) | HIGH | LOW | P1 |
| Upload validation + storage move (SEC-04) | HIGH | MEDIUM | P1 |
| BAST service consolidation (BUG-02) | HIGH | HIGH | P1 |
| BAST numbering in-transaction (BUG-03) | MEDIUM | MEDIUM | P1 |
| BAST separation of duties | HIGH | MEDIUM | P1 |
| RBAC + BAST Vitest suites (TEST-01) | HIGH | HIGH | P1 |
| `available_actions` UI gating | MEDIUM | MEDIUM | P2 |
| AuditLog wiring (post-consolidation) | MEDIUM | MEDIUM | P2 |
| Playwright E2E suite | MEDIUM | HIGH | P2 |
| Image re-encode (sharp) | LOW | MEDIUM | P3 |
| Admin-invite flow (needs email) | MEDIUM | HIGH | P3 |
| Object storage adapter | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have — all are live CRITICAL/HIGH findings or direct unblockers
- P2: Should have — governance value on top of a stable core
- P3: Nice to have — need external infra (email/hosting) or proven core first

## Competitor Feature Analysis

Patterns benchmarked against this project's plan (enterprise reference implementations, not direct product competitors):

| Feature | Standard Reference Implementations | Our Approach |
|---------|------------------------------------|--------------|
| RBAC in Next.js route handlers | Official Next.js auth guide: two-tier (`verifySession` → 401, role check → 403); Auth.js/Auth0 SDKs centralize in a `dal` layer | `requireRole`/`assertUser` helpers over existing `hasMinimumRole` — same two-tier semantics, no new framework |
| Registration | WorkOS/Auth0/cidaas/ScaiLabs: pending-grant invite row + short-lived token + verified-identity accept; `registration_settings.mode` (disabled/self_serve/invitation/waitlist); client-chosen role never accepted | Always-EMPLOYEE now (no email infra); invite designed for later. Client role input **deleted**, not defaulted |
| Upload validation | OWASP cheat sheet: allowlist, magic bytes, size limits, random filenames, store outside webroot, serve with `attachment`/nosniff, reject SVG | Mirrors OWASP exactly; `file-type` for bytes, 5 MB cap, non-`public` dir, authenticated serving route, `image/svg+xml` excluded |
| Numbering under concurrency | Cybertec/AppMaster 2026: DB sequence (unique, gaps OK) vs counter row + `FOR UPDATE` (gapless); number assigned in same transaction; unique index backstop; retry on serialization error | Per-type sequence or counter row inside the BAST service transaction + existing unique index on `bastNumber`; single shared numbering fn |
| Approval workflow | 2026 service-layer patterns: single service = only code that mutates status; transition table; audit row in same transaction; separation of duties; `available_actions` server-driven UI; illegal transitions write zero rows | `bast-service.ts` becomes the only status mutator; typed transition rules per `BastType`; self-approval rejected; UI consumes server decisions |
| Test coverage | 2026 Next.js consensus: Vitest unit for actions/handlers (mock `next/headers`, `redirect()` throws), NTARH for route handlers, Playwright E2E on production build; test the matrix not happy path | Vitest auth+RBAC matrix + BAST transition suite first (P1), Playwright second (P2) |

## Sources

- Next.js official docs (auth guide, `proxy.ts` matcher, `forbidden()`/`unauthorized()`) via Context7 `/vercel/next.js` — MEDIUM/HIGH
- OWASP File Upload Cheat Sheet (cheatsheetseries.owasp.org) — HIGH
- SecureStartKit / JustAppSec / jan-karel.com 2026 file-upload hardening guides — MEDIUM
- WorkOS, Auth0, cidaas, ScaiLabs user-management/invite docs (2025–2026) — MEDIUM
- Cybertec PostgreSQL "Sequences vs. Invoice numbers" + AppMaster concurrency-numbering 2025 — MEDIUM
- Prisma docs (interactive transactions, isolation levels, P2034) via Context7 — HIGH
- Playcode / ferminquant / openown-workflow / document-workflow-core approval-workflow guides (2026) — MEDIUM
- MDN 401/403 + RFC 7231 + AEP-211 authorization semantics — HIGH
- devcheolu / Next.js Launchpad / Code With Seb / DEV 2026 Next.js testing guides — MEDIUM
- 137Foundry RBAC guide + nomos `packages/rbac` matrix (2026) — MEDIUM
- Project sources: `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`, `lib/auth.ts`, `proxy.ts` (2026-08-10 codebase map)

---
*Feature research for: EAMS security hardening milestone (RBAC, registration, uploads, BAST integrity, test coverage)*
*Researched: 2026-08-10*