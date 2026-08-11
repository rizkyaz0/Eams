---
phase: 01-security-foundation
plan: 02
subsystem: auth
tags: [jwt, jose, prisma, tokenVersion, revocation, typed-identity]

# Dependency graph
requires:
  - phase: 01-plan-01
    provides: requireEnv (lib/env.ts), User.tokenVersion schema field + regenerated Prisma client, deny-by-default proxy gate, .env with JWT_SECRET
provides:
  - "Fail-fast JWT secret: lib/auth.ts throws at module load via requireEnv when JWT_SECRET is unset — no fallback constant exists anywhere (SEC-01)"
  - "Pinned token issuance/verification: issuer eams, audience eams-web, jti randomUUID, algorithms ['HS256'], parseClaims runtime validation (SEC-03)"
  - "Registration role pinning: register route ignores body role and stores the literal UserRole.EMPLOYEE (SEC-02)"
  - "tokenVersion revocation: password change (PATCH /api/users/[id]) and new POST /api/auth/logout-all bump tokenVersion; getCurrentUser rejects stale tokens (SEC-04)"
  - "Typed identity: strict JWTPayload without index signature + tokenVersion claim; compile-time guard; two live user.id bug sites fixed to user.userId (BUG-01)"
affects: [01-03 (unit tests import rewritten lib/auth + register route), 02-*, any future token-issuing endpoint]

# Tech tracking
tech-stack:
  added: [node:crypto randomUUID for jti]
  patterns:
    - "Pinned JWT: setIssuer/setAudience/setJti + jwtVerify with pinned issuer/audience/algorithms"
    - "One controlled cast at SignJWT boundary (JoseJWTPayload); strict JWTPayload everywhere else"
    - "verifyToken stateless (proxy fast gate) / getCurrentUser DB revocation check split"
    - "parseClaims as runtime claim validator between verified payload and trusted JWTPayload"

key-files:
  created:
    - app/api/auth/logout-all/route.ts
  modified:
    - lib/auth.ts
    - app/api/auth/register/route.ts
    - app/api/auth/login/route.ts
    - app/api/users/[id]/route.ts
    - app/api/bast/[id]/approve/route.ts
    - app/api/assets/[id]/return/route.ts

key-decisions:
  - "tokenVersion revocation check lives in getCurrentUser only — verifyToken stays DB-free because proxy.ts depends on its statelessness"
  - "users/[id] updateData typed as Prisma.UserUncheckedUpdateInput (divisionId is an unchecked FK input, not on checked UserUpdateInput)"
  - "BUG-01 guard implemented as module-level @ts-expect-error expression — directive-in-prose and unused-function variants both trip tsc/lint"

patterns-established:
  - "Auth-domain exports: assertUser (throw contract), getUserIdentity (5-field projection), bumpTokenVersion (revocation primitive)"
  - "Self-registration role pinning via literal enum value, never a body-derived cast"

requirements-completed: [SEC-01, SEC-02, SEC-03, SEC-04, BUG-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Fail-fast JWT secret — no hardcoded fallback; lib/auth.ts throws at module load when JWT_SECRET is unset"
    requirement: SEC-01
    verification:
      - kind: other
        ref: "Select-String lib/auth.ts 'your-secret-key' -> no match; renamed-.env 'npm run build' -> exit 1, 'Missing required environment variable: JWT_SECRET'; repo-wide grep 'JWT_SECRET\\s*\\|\\|' -> empty"
        status: pass
    human_judgment: false
  - id: D2
    description: "Pinned token issuance and verification — issuer eams, audience eams-web, jti (randomUUID), algorithms ['HS256'], parseClaims on every verified payload; forged claims rejected"
    requirement: SEC-03
    verification:
      - kind: other
        ref: "grep lib/auth.ts setIssuer|setAudience|setJti|algorithms -> matches; npx tsc --noEmit exit 0"
        status: pass
    human_judgment: true
    rationale: "Static pinning proven by grep/compile; runtime forged-claim rejection (wrong iss/aud/alg -> null) is unit-tested in plan 01-03"
  - id: D3
    description: "Self-registration stores role EMPLOYEE regardless of body role — privilege escalation impossible"
    requirement: SEC-02
    verification:
      - kind: other
        ref: "grep register/route.ts 'as UserRole' -> no match; 'UserRole.EMPLOYEE' -> match; npx tsc --noEmit exit 0"
        status: pass
    human_judgment: true
    rationale: "Grep/compile prove the body role is never read; runtime UAT (register with role:'SUPER_ADMIN' body -> stored role EMPLOYEE) is deferred to 01-03 per plan verification"
  - id: D4
    description: "tokenVersion revocation — password change and logout-all increment tokenVersion; prior tokens fail getCurrentUser and yield 401"
    requirement: SEC-04
    verification:
      - kind: other
        ref: "grep users/[id]/route.ts bumpTokenVersion -> match; logout-all/route.ts exists with bumpTokenVersion; lib/auth.ts getCurrentUser tokenVersion compare; npx tsc --noEmit exit 0"
        status: pass
    human_judgment: true
    rationale: "Code-path statically verified; runtime behavior (logout-all -> next request 401, password change invalidates old sessions) is unit-tested/UAT'd in 01-03 per plan verification"
  - id: D5
    description: "Typed identity — JWTPayload has no index signature, user.id no longer compiles, both live bug sites use user.userId"
    requirement: BUG-01
    verification:
      - kind: other
        ref: "npx tsc --noEmit exit 0; grep lib/auth.ts '\\[key: string\\]' -> no match; grep approve/return routes user.userId -> match"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-08-11
status: complete
---

# Phase 01 Plan 02: Auth Core Hardening Summary

**Fail-fast JWT secret, pinned iss/aud/jti/HS256 tokens with tokenVersion revocation, role-pinned self-registration, and a strict typed identity that kills the `user.id` bug class at compile time**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-11T11:10:00+07:00
- **Completed:** 2026-08-11T11:24:00+07:00
- **Tasks:** 3 (all auto)
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- `lib/auth.ts` rewritten: `requireEnv("JWT_SECRET")` module-load throw (SEC-01), pinned `generateToken`/`verifyToken` with issuer `eams`, audience `eams-web`, `jti` randomUUID, `algorithms: ["HS256"]` (SEC-03), `parseClaims` runtime validator, `getCurrentUser` tokenVersion revocation check (SEC-04), and new `assertUser` / `getUserIdentity` / `bumpTokenVersion` exports — `verifyToken` remains DB-free for the 01-01 proxy fast gate.
- Strict `JWTPayload` with `tokenVersion` and **no index signature**; one controlled cast (`as JoseJWTPayload`) only at the SignJWT boundary; compile-time guard proves `user.id` cannot compile and would fail tsc if the signature ever returned.
- Register route ignores body `role` entirely and stores the literal `UserRole.EMPLOYEE` (SEC-02); login + register tokens carry `tokenVersion`.
- New `POST /api/auth/logout-all` (bump + clear cookie) and `PATCH /api/users/[id]` password-change bump (SEC-04).
- BUG-01: `approverId: user.id || null` → `user.userId`; `creatorId: user.id as string` → `user.userId`. Full `npx tsc --noEmit` exits 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite lib/auth.ts — fail-fast, pinned tokens, typed identity, revocation** - `b4a2619` (feat)
2. **Task 2: Wire call sites — role pin, tokenVersion claims, logout-all, password-change revocation** - `3538c3e` (feat)
3. **Task 3: BUG-01 fixes + build gate** - `79aae89` (fix)

## Files Created/Modified

- `lib/auth.ts` - Rewritten auth core: requireEnv secret, pinned sign/verify, parseClaims, getCurrentUser revocation, assertUser/getUserIdentity/bumpTokenVersion, BUG-01 compile guard
- `app/api/auth/register/route.ts` - role dropped from body; `role: UserRole.EMPLOYEE` literal; tokenVersion claim (SEC-02)
- `app/api/auth/login/route.ts` - tokenVersion claim added
- `app/api/auth/logout-all/route.ts` - NEW: revoke all sessions for current user (SEC-04)
- `app/api/users/[id]/route.ts` - password change bumps tokenVersion; `updateData` typed `Prisma.UserUncheckedUpdateInput` (was `any`)
- `app/api/bast/[id]/approve/route.ts` - `approverId: user.userId` (BUG-01)
- `app/api/assets/[id]/return/route.ts` - `creatorId: user.userId` (BUG-01)

## Decisions Made

- **tokenVersion check in getCurrentUser only** — verifyToken stays stateless so the 01-01 proxy gate keeps its DB-free fast path (plan key_link, R2).
- **Prisma input variant** — `divisionId` is an unchecked foreign-key input; `UserUpdateInput` (checked) only exposes the relation-style `division`. The pre-existing `any` was masking this; typed as `Prisma.UserUncheckedUpdateInput`.
- **BUG-01 guard form** — module-level `@ts-expect-error` expression statement. Initial variants failed verification: a never-called function tripped `no-unused-vars`, and prose containing the `@ts-expect-error` token made the directive report unused (TS2578).
- **logout-all handler signature** — `POST()` with no `request` param, matching the existing `app/api/auth/logout/route.ts` convention and avoiding an unused-parameter warning.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Type correctness] Pre-existing `any` in users/[id] PATCH blocked the touched-files lint gate**
- **Found during:** Task 2 (users/[id] password-change bump)
- **Issue:** `const updateData: any = {}` (pre-existing) triggered `@typescript-eslint/no-explicit-any` in a plan-touched file. Typing it surfaced that `divisionId` is not on the checked `Prisma.UserUpdateInput`.
- **Fix:** `const updateData: Prisma.UserUncheckedUpdateInput = {};` — correct variant for raw FK scalar input; all existing assignments compile.
- **Files modified:** app/api/users/[id]/route.ts
- **Verification:** `npx eslint` clean on the file; `npx tsc --noEmit` shows only the 2 expected user.id errors at that point; final tsc exit 0.
- **Committed in:** 3538c3e (Task 2 commit)

**2. [Rule 3 - Blocking] BUG-01 compile guard tripped tsc/lint in its initial form**
- **Found during:** Task 1 (lib/auth.ts rewrite)
- **Issue:** (a) never-called guard function → `@typescript-eslint/no-unused-vars` warning; (b) JSDoc/prose line containing the literal `@ts-expect-error` token caused TS2578 "Unused '@ts-expect-error' directive" because TS treated the prose line as a directive.
- **Fix:** module-level `void ({} as JWTPayload).id;` with the directive on the immediately preceding line, and prose reworded to avoid the directive token.
- **Files modified:** lib/auth.ts
- **Verification:** `npx tsc --noEmit` reports exactly the 4 expected intermediate errors after Task 1 (no TS2578); lint exit 0; final tsc exit 0.
- **Committed in:** b4a2619 (Task 1 commit)

**3. [Rule 2 - Cleanup] Unused `request` param in new logout-all route**
- **Found during:** Task 2 (logout-all route)
- **Issue:** `POST(request: NextRequest)` with no use of `request` → unused-var warning.
- **Fix:** dropped the parameter — `export async function POST()`, matching existing `app/api/auth/logout/route.ts`.
- **Files modified:** app/api/auth/logout-all/route.ts
- **Verification:** `npx eslint` clean.
- **Committed in:** 3538c3e (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 type-correctness, 1 blocking, 1 cleanup)
**Impact on plan:** All fixes preserve plan intent and satisfy AGENTS.md (no new `any`; one existing `any` removed). No scope creep; security semantics untouched (SEC-01..05 changes are exactly as specified — no security-related deviation occurred).

## Issues Encountered

- **jose generic compatibility (research assumption A4):** `jwtVerify<JWTPayload>` compiles with the strict interface — jose v6 declares `PayloadType = JWTPayload` with no `extends` constraint, so the strict payload does not re-intersect an index signature at verification sites. The BUG-01 guard remains the tripwire if this ever changes.
- **Touched-files lint on approve/return routes:** `npx eslint` on the two BUG-01 files reports 3 pre-existing `@typescript-eslint/no-explicit-any` errors (`catch (error: any)` in both, `const updateData: any` in approve) and 1 pre-existing unused-import warning (`NextResponse` in approve). The plan explicitly forbids touching the catch blocks (internal error.message leak is Phase 2 SEC-09 scope) — left as-is and logged to `deferred-items.md` (#3).

## Verification Output (exact)

- `Select-String lib/auth.ts 'your-secret-key'` → **no match**; repo-wide `JWT_SECRET\s*\|\|` / `your-secret-key` scan → **empty**
- `Select-String lib/auth.ts '\[key: string\]'` → **no match**
- `setIssuer|setAudience|setJti|algorithms` in lib/auth.ts → **matches present**
- `parseClaims|assertUser|getUserIdentity|bumpTokenVersion` in lib/auth.ts → **matches present**
- Register route: `'as UserRole'` → **no match**; `UserRole.EMPLOYEE` → **match**; `Test-Path app/api/auth/logout-all/route.ts` → **True**
- Task 1 intermediate `npx tsc --noEmit` (exit 2) → **exactly 4 expected errors**: tokenVersion missing in login(36)/register(57), user.id in return(47)/approve(31)
- Task 2 intermediate `npx tsc --noEmit` (exit 2) → **exactly 2 expected errors**: user.id in return(47)/approve(31)
- Task 3 final `npx tsc --noEmit` → **exit 0**
- `npm run build` with .env → **exit 0** (full route table emitted)
- Renamed-.env build → **exit 1**, error `[cause]: Error: Missing required environment variable: JWT_SECRET. Check your .env file.` from `lib/env.ts:9`; `.env` restored in `finally` (RESTORED_ENV=True, JWT_SECRET verified 64 chars)
- `npx eslint` on plan-touched files → exit 0 for lib/auth.ts, register, login, logout-all, users/[id]; approve/return have only the 3 pre-existing `any` errors + 1 unused-import warning (above)

## Known Stubs

None — no placeholder values, mock data, or unwired components introduced by this plan.

## Threat Flags

None — no security-relevant surface beyond the plan's `<threat_model>`. New endpoint `POST /api/auth/logout-all` (T-01-13) is guarded by `getCurrentUser` → `unauthorizedResponse` per plan; no schema/trust-boundary changes beyond the planned `bumpTokenVersion` write.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01-03 can import the rewritten `lib/auth.ts` (parseClaims, generateToken, verifyToken, getCurrentUser, bumpTokenVersion) and the pinned register route for unit tests.
- Remaining runtime UAT deferred to 01-03 per plan verification: register with `role:"SUPER_ADMIN"` body → stored/returned role EMPLOYEE; logout-all → next request 401; wrong-iss/aud/alg token rejection.
- Pre-existing sessions are now invalid (R3) — a one-time forced re-login is expected and intended.

---
*Phase: 01-security-foundation*
*Completed: 2026-08-11*

## Self-Check: PASSED

- `01-02-SUMMARY.md` exists ✅
- `app/api/auth/logout-all/route.ts` exists ✅
- Commit `b4a2619` (Task 1) exists ✅
- Commit `3538c3e` (Task 2) exists ✅
- Commit `79aae89` (Task 3) exists ✅
