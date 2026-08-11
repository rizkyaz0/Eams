---
phase: 01-security-foundation
plan: 01
subsystem: auth
tags: [jwt, prisma, postgres, middleware, security, fail-fast]

# Dependency graph
requires: []
provides:
  - lib/env.ts requireEnv fail-fast primitive (module-load throw when JWT_SECRET unset)
  - prisma/schema.prisma User.tokenVersion Int @default(0) — applied to live local PostgreSQL
  - Aligned @prisma/client ^6.19.3 / jose ^6.2.8 (lockfile consistent)
  - Deny-by-default proxy gate (exact-match PUBLIC_PATHS, 401 for /api/*, 302 /login for pages)
  - (authenticated) layout login guard (redirect when getCurrentUser() null)
affects: [01-02 (pinned tokens — consumes lib/env.ts + tokenVersion), 01-03 (tests — proxy-independent register fix), verify-work UAT]

# Tech tracking
tech-stack:
  added: [jose bumped to ^6.2.8 (already installed dep)]
  patterns:
    - "Fail-fast env validation at module load (requireEnv) — no default secret anywhere"
    - "Deny-by-default request gate: exact Set membership for public allow-list; startsWith('/api') only to choose 401-vs-redirect"
    - "Proxy as stateless fast gate — no Prisma/getCurrentUser in the hot path; handlers re-verify"

key-files:
  created: [lib/env.ts]
  modified: [prisma/schema.prisma, package.json, package-lock.json, .env, proxy.ts, app/(authenticated)/layout.tsx]

key-decisions:
  - "tokenVersion Int @default(0) added to User beside updatedAt — additive column, no migration baseline (research Open Question 1 deferred)"
  - "PUBLIC_PATHS is an exact-match Set ([\"/\", \"/login\", \"/register\", \"/api/auth/login\", \"/api/auth/register\"]) — prefix matching would open lookalike routes"
  - "x-user-id/x-user-role proxy header injection deleted — grep-verified no handler reads them (dead plumbing, T-01-04)"
  - "Proxy stays stateless (verifyToken only, no DB); revocation enforced at handler boundary (T-01-05)"

patterns-established:
  - "requireEnv(name) throws `Missing required environment variable: ${name}. Check your .env file.` at module load — SEC-01 foundation consumed by lib/auth.ts in plan 01-02"
  - "Deny-by-default gate ordering: public exact match → token verify → 401/302 → next()"

requirements-completed: [SEC-01, SEC-04, SEC-05, DATA-02]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "Fail-fast env guard: lib/env.ts requireEnv throws at module load when an env var (e.g. JWT_SECRET) is unset"
    requirement: SEC-01
    verification:
      - kind: other
        ref: "npx eslint lib/env.ts (exit 0 — plan files lint clean)"
        status: pass
      - kind: other
        ref: "npm run build (exit 0 — lib/env.ts compiles into the bundle)"
        status: pass
    human_judgment: false
  - id: D2
    description: "User.tokenVersion Int @default(0) in schema AND applied to live DB; @prisma/client and prisma CLI aligned to ^6.19.3"
    requirement: SEC-04
    verification:
      - kind: other
        ref: "npx prisma validate (exit 0 — schema valid)"
        status: pass
      - kind: other
        ref: "npx prisma db push (exit 0 — 'The database is already in sync with the Prisma schema', PostgreSQL eams@localhost:5432)"
        status: pass
      - kind: other
        ref: "node -e package.json check — versions aligned: @prisma/client=^6.19.3 jose=^6.2.8"
        status: pass
    human_judgment: false
  - id: D3
    description: "Deny-by-default request gate in proxy.ts: exact PUBLIC_PATHS allow-list; anonymous /api/* → 401 JSON; anonymous pages → 302 /login?redirect=<path>; dead x-user-id/x-user-role headers removed"
    requirement: SEC-05
    verification:
      - kind: other
        ref: "npm run build (exit 0 — proxy compiles; route table shows 'ƒ Proxy (Middleware)')"
        status: pass
      - kind: other
        ref: "grep gates: no 'x-user-id', no 'protectedRoutes'; 'PUBLIC_PATHS' present in proxy.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "(authenticated) layout redirects to /login when getCurrentUser() is null (defense-in-depth backstop)"
    requirement: SEC-05
    verification:
      - kind: other
        ref: "npm run build (exit 0 — layout guard type-checks)"
        status: pass
      - kind: other
        ref: "npx eslint \"app/(authenticated)/layout.tsx\" (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 28min
completed: 2026-08-11
status: complete
---

# Phase 01 Plan 01: Security Foundation Summary

**Fail-fast env guard (requireEnv), User.tokenVersion schema + live-DB column, aligned Prisma client (^6.19.3) / jose (^6.2.8), and a deny-by-default proxy gate with exact-match public allow-list plus a layout login guard**

## Performance

- **Duration:** 28 min (Task 1 ~10:41–10:55, Task 2 verification + wrap-up ~10:55–11:08, local +07:00)
- **Started:** 2026-08-11T03:41:00Z
- **Completed:** 2026-08-11T04:08:00Z
- **Tasks:** 2/2
- **Files modified:** 7 (plan scope) + 1 SUMMARY

## Accomplishments

- `lib/env.ts` shipped with JSDoc'd `requireEnv(name)` that throws at module load — the SEC-01 fail-fast primitive plan 01-02 will wire into `lib/auth.ts`
- `User.tokenVersion Int @default(0)` added to the Prisma schema and confirmed applied to the live local PostgreSQL (`eams@localhost:5432`) — SEC-04 revocation field
- `@prisma/client` aligned to `^6.19.3` (caret style, matching the `prisma` CLI) and `jose` bumped to `^6.2.8` — DATA-02
- `proxy.ts` rewritten to deny-by-default: exact-match `PUBLIC_PATHS` set, anonymous `/api/*` → 401 JSON, anonymous pages → 302 `/login?redirect=<pathname>`, and the dead `x-user-id`/`x-user-role` header injection deleted — SEC-05
- `app/(authenticated)/layout.tsx` now redirects to `/login` when `getCurrentUser()` returns null (defense-in-depth backstop against middleware-bypass, T-01-05)
- `.env` populated with a real 64-hex `JWT_SECRET` (crypto.randomBytes(32)), real local `DATABASE_URL`/`DIRECT_URL`, confirmed gitignored

## Task Commits

Each task was committed atomically:

1. **Task 1: Env guard + tokenVersion schema + data alignment** - `feef112` (chore)
2. **Task 2: Deny-by-default request gate** - `2abc909` (feat)

**Pre-execution context commits (from plan phase / orchestrator):** `f71a815` (docs: plan security foundation), `585939b` (docs: plan-checker hardening), `21890e5` (chore: align deps pre-execution)

**Plan metadata:** `2abc909` is the last code commit; this SUMMARY is committed separately (docs).

## Files Created/Modified

- `lib/env.ts` - NEW — `requireEnv(name)` fail-fast env guard (JSDoc'd, double-quote/semicolon house style)
- `prisma/schema.prisma` - `User.tokenVersion Int @default(0)` beside `updatedAt` (line 48)
- `package.json` / `package-lock.json` - `@prisma/client ^6.19.3`, `jose ^6.2.8`
- `.env` - gitignored; `JWT_SECRET` (64-hex), `DATABASE_URL`/`DIRECT_URL` → `postgresql://postgres:postgres@localhost:5432/eams`
- `proxy.ts` - deny-by-default gate; `PUBLIC_PATHS` exact Set; 401/302 routing; header injection removed
- `app/(authenticated)/layout.tsx` - `redirect("/login")` guard after `getCurrentUser()`

## Decisions Made

- **tokenVersion added as additive `Int @default(0)` column** — no data backfill, no `prisma/migrations/` baseline introduced (deferred per research Open Question 1; project convention is `db push`)
- **Exact-match Set for public routes** — a prefix match would have allowed lookalike paths (T-01-03); `startsWith("/api")` used only to choose 401-vs-redirect
- **Proxy kept stateless** — `verifyToken` only, no `getCurrentUser`, no Prisma in the hot path; revocation enforced at the handler boundary (T-01-05)
- **Dead header plumbing deleted** — `x-user-id`/`x-user-role` were grep-verified to have no consumers (T-01-04)

## Deviations from Plan

None — plan executed exactly as written (both tasks' actions, files, and commit messages match the plan verbatim).

Context notes (not deviations):
- Task 2's implementation was committed by the previous executor attempt (`2abc909`) before it errored on a PowerShell `$`-escaping issue during verification. This continuation ran the plan's Task 2 verification (lint/build/grep gates) and confirmed the committed state satisfies every `done` criterion. No code changes were needed.
- **Repo-wide `npm run lint` exits 1 (159 pre-existing problems)** — see Issues Encountered. The plan's lint gate passes for all plan-touched files (`proxy.ts`, `app/(authenticated)/layout.tsx`, `lib/env.ts` → eslint exit 0). Classified out-of-scope per the scope boundary (no error file is in the plan's `files_modified` list); logged to `deferred-items.md`.

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** None — all plan goals achieved as written.

## Issues Encountered

1. **Prior-attempt PowerShell escaping error (environmental).** The previous executor's inline `npx tsx -e` command with `$` got mangled by PowerShell. Worked around by avoiding inline `tsx -e` entirely — no runtime script was actually needed for this plan's verification.
2. **Pre-existing repo-wide lint baseline.** `npm run lint` reports 100 errors / 59 warnings across ~50 untouched files. Root causes: ~85 `@typescript-eslint/no-explicit-any` (AGENTS.md forbids *new* `any`, grandfathers existing), `react-hooks` v6 rule additions (set-state-in-effect, immutability, purity, incompatible-library, exhaustive-deps), plus `prefer-const`, `ban-ts-comment`, `no-img-element`, `no-unescaped-entities`. Not introduced by this plan; a follow-up cleanup plan is warranted (see `deferred-items.md`).
3. **`npx prisma generate` EPERM on re-run (Windows DLL lock).** A `next dev` server (PIDs 6952/11088/13300, started 10:41) holds `query_engine-windows.dll.node`, so re-running generate after the fact fails with `EPERM: operation not permitted, rename`. The client was regenerated successfully during Task 1 (orchestrator-verified) and is proven functional by the passing build and the running dev server. Environmental; documented in `deferred-items.md`.
4. **DB blocker (pre-execution, resolved by orchestrator).** Supabase unreachable from this network → switched to local PostgreSQL (`postgres/postgres@localhost:5432/eams`); `prisma db push` + seed applied successfully. Demo login: admin@eams.com / password123.

## Known Stubs

None — `proxy.ts`, `lib/env.ts`, and the layout guard are real implementations with no placeholder values.

## User Setup Required

No USER-SETUP.md generated. Environment configuration (`.env`: JWT_SECRET, DATABASE_URL, DIRECT_URL) was completed by the agent/orchestrator; `.env` is gitignored and stays local.

## Verification Results (exact outputs)

Task 1 (re-checked in this continuation):
- `npx prisma validate` → `The schema at prisma\schema.prisma is valid 🚀` — exit 0
- `npx prisma db push` → `The database is already in sync with the Prisma schema.` (PostgreSQL "eams", public, localhost:5432) — exit 0
- `git check-ignore .env` → `.env` — exit 0
- `node -e` package check → `versions aligned: @prisma/client=^6.19.3 jose=^6.2.8`
- `Select-String prisma/schema.prisma 'tokenVersion'` → `tokenVersion  Int  @default(0)` (line 48)

Task 2:
- `npm run build` → `✓ Compiled successfully in 5.5s` / `✓ Generating static pages using 7 workers (27/27)` / `ƒ Proxy (Middleware)` in route table — exit 0
- `npx eslint proxy.ts "app/(authenticated)/layout.tsx" lib/env.ts` → no output, exit 0
- `Select-String proxy.ts 'x-user-id'` → no matches (dead headers removed)
- `Select-String proxy.ts 'protectedRoutes'` → no matches (allow-list inverted)
- `Select-String proxy.ts 'PUBLIC_PATHS'` → 2 matches (set definition + gate check)

## Threat Surface Scan

No security-relevant surface beyond the plan's modeled threat register. The new surface introduced (401 JSON responses, 302 redirects, module-load env assertion) is exactly what T-01-01..T-01-07 model; dispositions unchanged. No flags.

## Next Phase Readiness

- Plan 01-02 can consume `lib/env.ts` in `lib/auth.ts` (module-load throw fires for every server module touching auth), the regenerated Prisma client with `User.tokenVersion`, and the deny-by-default proxy gate
- Plan 01-03's register test can proceed (needs the proxy-independent register route fix from 01-02)
- Deferred runtime smoke (anonymous `GET /assets` → 302; anonymous `GET /api/assets` → 401 JSON) is scheduled in the plan for after plan 01-02 lands, per `<verification>`
- Watch item: keep `npm run lint` repo-wide failure in mind — plan-level lint gates should be scoped to plan files until the baseline cleanup plan ships

## Self-Check: PASSED

- FOUND: `.planning/phases/01-security-foundation-auth-registration-typed-identity/01-01-SUMMARY.md`
- FOUND: `.planning/phases/01-security-foundation-auth-registration-typed-identity/deferred-items.md`
- FOUND in git history: `feef112` (Task 1 commit), `2abc909` (Task 2 commit)

---
*Phase: 01-security-foundation*
*Completed: 2026-08-11*
