---
phase: "01"
name: "security-foundation-auth-registration-typed-identity"
created: 2026-08-11
status: passed
---

# Phase 01: security-foundation-auth-registration-typed-identity - Verification

## Goal-Backward Verification

**Phase Goal:** Users get trustworthy sessions — the app fails fast without a JWT secret, tokens are verified with pinned issuer/audience/algorithm/jti and revocable via tokenVersion, self-registration can never elevate a role, and identity is typed so the `user.id` class of bug dies at compile. Vitest infrastructure and the first auth unit tests land here.

**Deviation (developer decision):** Plan 01-03 (Vitest infrastructure + auth unit tests, TEST-01/TEST-02) was REJECTED by the developer at its blocking-human checkpoint (vitest-mock-extended install approval). No test infrastructure was installed. Success criterion 5 ("Vitest suite runs; auth tests pass") is therefore NOT met and is deferred. All security code changes were verified via build gates, tsc, grep gates, and live HTTP runtime smoke tests instead.

## Checks

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| SEC-01 | Fail-fast when JWT_SECRET unset (no hardcoded fallback) | PASS | `npm run build` with `.env` renamed → exit 1 `Error: Missing required environment variable: JWT_SECRET` (01-02); grep: no `your-secret-key` / `JWT_SECRET ||` repo-wide |
| SEC-02 | Public registration always creates EMPLOYEE; role from body removed | PASS | Live HTTP: `POST /api/auth/register` with `role:"SUPER_ADMIN"` → 201 with `"role":"EMPLOYEE"` stored + returned; grep: no `as UserRole` in register route, `UserRole.EMPLOYEE` literal present |
| SEC-03 | jose verify pinned issuer/audience/algorithms:['HS256']/jti | PASS | Live HTTP (real admin user, current tokenVersion): wrong iss → 401, wrong aud → 401, crafted alg:none token → 401; correct claims → 200. grep: `setIssuer|setAudience|setJti|algorithms` in lib/auth.ts |
| SEC-04 | tokenVersion — password change / logout-all invalidates prior tokens (401) | PASS | Live HTTP: `POST /api/auth/logout-all` → 200; `/api/auth/me` with same cookie → 401; stale tokenVersion (current-1) with valid signature → 401; correct tokenVersion → 200 |
| SEC-05 | proxy.ts deny-by-default (pages → /login, /api/* → 401) | PASS | Live HTTP: anonymous `/assets` → 307 `/login?redirect=%2Fassets`; anonymous `/api/assets` → 401 JSON `{"success":false,"error":"Unauthorized"}`; grep: `PUBLIC_PATHS` present, no `protectedRoutes` |
| BUG-01 | user.id vs user.userId — no index signature; typed identity | PASS | `npx tsc --noEmit` exit 0; grep: no `[key: string]` index signature on JWTPayload; both live bug sites fixed (approve/return use user.userId); module-level `@ts-expect-error` negative-compile guard |
| TEST-01 | Vitest + vitest-mock-extended infra | NOT MET (deferred) | Plan 01-03 rejected by developer at blocking-human checkpoint — no test infra installed |
| TEST-02 | Auth unit tests | NOT MET (deferred) | Same as TEST-01 |
| DATA-02 | Align Prisma CLI 6.19.3 vs client 6.19.0 | PASS | `@prisma/client=^6.19.3`; `npx prisma validate` exit 0; `db push` applied tokenVersion to `eams@localhost:5432` |

## Result

**Verdict: PASSED** (with documented deviation)

Success criteria 1–4 are verified end-to-end (build gates + live HTTP smoke tests against the seeded local DB). Success criterion 5 (Vitest suite) is NOT met — plan 01-03 was rejected by the developer; the test suite is deferred to a later phase and tracked in `deferred-items.md`. Runtime behavior previously covered by unit tests (env throw, claim pinning, role pinning, revocation) was instead proven via live HTTP checks and build gates.

Remaining risks:
- No automated regression suite for auth behavior (deferred TEST-01/TEST-02).
- Repo-wide pre-existing lint baseline failure (100 err/59 warn, mostly `no-explicit-any`) — out of scope, tracked in `deferred-items.md`.
- Existing sessions invalidated by design (tokenVersion bump) — one-time forced re-login.
