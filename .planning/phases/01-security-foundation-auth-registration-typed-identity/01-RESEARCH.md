# Phase 1: Security Foundation — Auth, Registration & Typed Identity — Research

**Researched:** 2026-08-11
**Domain:** JWT authentication hardening (jose), Next.js 16 request-layer security (proxy.ts), registration hardening, typed identity, Vitest test infrastructure, Prisma version alignment
**Confidence:** HIGH (versions verified against npm registry 2026-08-11; API patterns cross-checked against official docs via Context7)

> **Note on CONTEXT.md:** No CONTEXT.md exists for this phase (`has_context: false` — discuss-phase not yet run). The `<user_constraints>` section is therefore omitted; the locked scope is taken from REQUIREMENTS.md (SEC-01..05, BUG-01, TEST-01..02, DATA-02) and ROADMAP.md Phase 1. If a CONTEXT.md is produced before planning, the planner must honor it over this document.

## Summary

Phase 1 makes sessions trustworthy in three moves: (1) **fail-fast + pinned verification** — the hardcoded `JWT_SECRET` fallback in `lib/auth.ts:8` is replaced by a module-load `requireEnv("JWT_SECRET")` assertion, and `jwtVerify` is pinned with `issuer`, `audience`, and `algorithms: ['HS256']` per jose 6.2.8 docs; (2) **registration + revocation** — the public register route stops reading `role` from the body (`role: (role as UserRole) || UserRole.EMPLOYEE` at `register/route.ts:48` is a live privilege-escalation vector) and a `tokenVersion` column on `User` makes previously issued tokens revocable (password change / logout-all → 401); (3) **deny-by-default request gate** — `proxy.ts` inverts from a hand-maintained `protectedRoutes` prefix list (missing `/assets`, `/bast`, `/api/dashboard`, `/api/reports` today) to an explicit public allow-list, plus the typed-identity fix (`user.id` vs `user.userId` at `bast/[id]/approve/route.ts:31` and `assets/[id]/return/route.ts:47`) that dies at compile by removing the `JWTPayload` index signature.

The phase also lands the project's first test infrastructure (Vitest 4.1.10 + vitest-mock-extended 5.1.1) with the redirect-mock-throws rule, async `next/headers` cookie mocks, and `mockDeep<PrismaClient>()`, and aligns Prisma CLI/client to 6.19.3 (DATA-02).

**Primary recommendation:** Rewrite `lib/auth.ts` around a strict `JWTPayload` interface (no index signature), a `requireEnv` fail-fast secret, and pinned sign/verify with `jti = crypto.randomUUID()`; enforce revocation (`tokenVersion`) in `getCurrentUser()` (the handler boundary), keeping `verifyToken()` stateless so `proxy.ts` stays a fast gate; invert `proxy.ts` to a public allow-list; hardcode `UserRole.EMPLOYEE` in the register handler and delete the `role` destructure. All verifiable with unit tests from day one.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Fail fast at startup when `JWT_SECRET` unset — no hardcoded fallback | `requireEnv()` module-load throw in `lib/env.ts`, imported by `lib/auth.ts` at module top; breaks `next dev` compile, `next build`, and `next start`; optionally backed by `instrumentation.ts` `register()` which runs once at server init (verified: Next skips `register()` during `phase-production-build`). lib/auth is imported only by server modules (grep-verified) so the throw cannot break the client bundle. jose additionally rejects HMAC keys < 32 bytes at sign/verify time. |
| SEC-02 | Public registration always creates role EMPLOYEE; body role removed/ignored | Delete `role` from the register route destructure (`register/route.ts:11,48`); construct `data.role` as literal `UserRole.EMPLOYEE`. Unit test: POST with `role: "SUPER_ADMIN"` → stored role EMPLOYEE, response 201 with role EMPLOYEE (mockDeep-backed). |
| SEC-03 | jwtVerify pinned to issuer, audience, `algorithms: ['HS256']`, and jti | jose 6.2.8 `jwtVerify(token, key, { issuer, audience, algorithms })` per official JSDoc; `SignJWT().setIssuer().setAudience().setJti(randomUUID()).setIssuedAt().setExpirationTime("7d")`; error classification via `err.code` (`ERR_JWT_CLAIM_VALIDATION_FAILED`, `ERR_JOSE_ALG_NOT_ALLOWED`). Test: wrong iss/aud → rejected. |
| SEC-04 | tokenVersion — password change / logout-all invalidates old tokens (401) | `tokenVersion Int @default(0)` on User (verified pattern, jsonic 2026-05-23); embed as claim at issue; compare claim vs DB in `getCurrentUser()` (one indexed PK lookup, cacheable); `bumpTokenVersion()` = `update({ tokenVersion: { increment: 1 } })` called on password change and logout-all. Cost/benefit in Architecture Patterns. |
| SEC-05 | proxy.ts deny-by-default — `(authenticated)` + `/api/*` protected except explicit public allow-list; pages redirect to `/login`, API returns 401 | Next.js 16 `proxy.ts` (renamed from middleware; codemod `middleware-to-proxy` exists). Official auth guide pattern: `publicRoutes` array + redirect-to-login; API guard returns `Response.json(..., { status: 401 })`. Keep broad static-excluding matcher, invert decision logic in proxy body against `PUBLIC_PATHS`. |
| BUG-01 | Remove `JWTPayload` index signature; typed `assertUser()`/`getUserIdentity()` | jose `jwtVerify<PayloadType>` is generic — pass strict `JWTPayload` so `.id` fails to compile; one controlled cast at the `SignJWT` boundary; runtime claim validator `isJWTPayload()` + `assertUser()`/`getUserIdentity()` helpers. Fixes live bugs at `bast/[id]/approve/route.ts:31` and `assets/[id]/return/route.ts:47`. |
| TEST-01 | Vitest + vitest-mock-extended infra: redirect mock throws, mock `next/headers`, `mockDeep<PrismaClient>` | Vitest 4.1.10 + vitest-mock-extended 5.1.1 (official Prisma unit-testing pattern); `resolve.alias` for `@/*`; `environment: 'node'`; setupFiles bake the throwing-redirect mock and async cookies() mock. |
| TEST-02 | Auth unit tests: env missing → throws; wrong iss/aud → rejected; register SUPER_ADMIN → stored EMPLOYEE | Testable via `vi.resetModules()` + `vi.stubEnv()` + dynamic `import()` for the throw; wrong-iss/aud via `SignJWT` with bad claims + `verifyToken` → null; register via `mockDeep<PrismaClient>()` + `NextRequest`. |
| DATA-02 | Align Prisma CLI 6.19.3 / client 6.19.0 | Both `prisma` and `@prisma/client` latest 6.x = 6.19.3 (npm registry, 2026-08-11). Rule: keep CLI and client in lockstep; `npm i @prisma/client@6.19.3` + `npm i -D prisma@6.19.3` + `npx prisma generate`. Patch divergence produces version warnings and generated-client drift. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| JWT signing/verification (iss/aud/alg/jti) | API / Backend (`lib/auth.ts`) | — | The signature+claims boundary must run where the secret lives (server); never in the browser. |
| Fail-fast secret assertion | API / Backend (`lib/env.ts` → `lib/auth.ts` module load) | Frontend Server (proxy compiles lib/auth too) | Startup/build-time gate; the proxy inherits it because it imports `verifyToken`. |
| Role pinning on self-registration | API / Backend (`register/route.ts`) | — | Server-side enforcement; body `role` must never reach Prisma `data`. |
| Revocation check (tokenVersion vs DB) | API / Backend (`getCurrentUser()` in handlers/actions/layout) | — | Needs a DB read — lives at the handler boundary, NOT in the stateless proxy. |
| Request gate: redirect pages / 401 APIs | Frontend Server (`proxy.ts`) | API (handlers still re-verify — defense in depth) | Proxy is a routing/interception layer (CVE-2025-29927 class); enforcement repeats in handlers. |
| Typed identity (no index signature) | API / Backend (types in `lib/auth.ts`) | — | Compile-time kill of the `user.id` bug class. |
| Test infrastructure (Vitest, mocks) | Dev tooling (repo root `vitest.config.ts`, `vitest.setup.ts`) | — | Developer-machine/CI concern, not runtime. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jose | 6.2.8 (installed ^6.1.3 — bump) | JWT sign/verify with pinned iss/aud/alg/jti | Only actively maintained JOSE implementation (panva); `jwtVerify` options are the documented way to pin issuer/audience/algorithms; error codes are stable strings. [VERIFIED: npm registry 2026-08-11 + Context7 /panva/jose] |
| Vitest | 4.1.10 | Unit test runner | ESM+TS native through the Vite pipeline the project already uses; Prisma's 2026 unit-testing guidance is Vitest-based. [VERIFIED: npm registry 2026-08-11] |
| vitest-mock-extended | 5.1.1 | `mockDeep<PrismaClient>()` deep mocks | Official Prisma testing pattern (`DeepMockProxy`); same API as jest-mock-extended but for Vitest. [VERIFIED: npm registry 2026-08-11 + Context7 /eratio08/vitest-mock-extended] |
| @prisma/client + prisma CLI | 6.19.3 both (align from 6.19.0 / 6.19.3) | ORM | DATA-02: CLI and client must move in lockstep; 6.19.3 is the latest 6.x for both. Prisma 7.9.1 exists but is explicitly out of scope (generator/client layout change). [VERIFIED: npm registry 2026-08-11] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supertest | 7.2.2 | Drive route handlers in integration tests | Phase 2's role-matrix suite; optional for Phase 1 (TEST-01/02 can run handlers directly with `NextRequest`). Install in Phase 2 to keep Phase 1 lean. [VERIFIED: npm registry 2026-08-11] |
| @vitejs/plugin-react | 6.0.5 | React transform in Vitest | Only if/when client-component tests are added (e.g., CSV export escaping). Not required for the auth/server suite. [VERIFIED: npm registry 2026-08-11] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jose `jwtVerify` with options | jsonwebtoken | Legacy callback API, CommonJS-only, past vulns; jose already installed. |
| `tokenVersion` claim+DB check | Redis jti denylist / session table | Version check = 1 indexed DB read per request, zero new infra; denylist needs Redis; session table is Phase-2+ scope. |
| Vitest | Jest 30 | Jest needs ts-jest/SWC + ESM interop work for no gain; Prisma docs and `with-vitest` examples assume Vitest. |
| `requireEnv()` module-load throw | zod env schema (t3-env style) | Both fine; zod adds a dependency and Phase 1 validates exactly one variable — plain `requireEnv` is sufficient. |
| `crypto.randomUUID()` | uuid package | `node:crypto` is built in; `randomUUID()` is a global in Node 19+/24. |

**Installation:**
```bash
# Bump jose to current; align Prisma CLI+client (DATA-02); add test infra (TEST-01)
npm install jose@^6.2.8 @prisma/client@6.19.3
npm install -D prisma@6.19.3 vitest@^4.1.10 vitest-mock-extended@^5.1.1
npx prisma generate
```

**Version verification (run 2026-08-11):**
```bash
npm view jose version            # 6.2.8
npm view vitest version          # 4.1.10
npm view vitest-mock-extended version  # 5.1.1
npm view prisma@6 version        # latest 6.x = 6.19.3
npm view @prisma/client@6 version  # latest 6.x = 6.19.3
```
Note: `eslint-config-next` is still 16.1.6 while `next` is ^16.3.0 — a known drift (prior research Pitfall 14); deferring the lint-config bump to the closing phase is acceptable, or do it here as a one-line devDependency bump.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| jose | npm | 8+ yrs (6.2.8 pub 2026-08-03) | ~113.6M/wk | github.com/panva/jose | SUS (recency flag only) | Approved — established; flag is publish-date recency, not risk |
| vitest | npm | 4+ yrs (4.1.10 pub 2026-07-06) | ~89.7M/wk | github.com/vitest-dev/vitest | OK | Approved |
| vitest-mock-extended | npm | 4+ yrs (5.1.1 pub 2026-08-02) | ~1.26M/wk | github.com/eratio08/vitest-mock-extended | SUS (recency flag only) | Flagged — planner adds checkpoint:human-verify before install |
| supertest | npm | 10+ yrs (7.2.2 pub 2026-01-06) | ~17M/wk | github.com/ladjs/supertest | OK | Approved (optional this phase) |
| @vitejs/plugin-react | npm | 5+ yrs (6.0.5 pub 2026-07-30) | ~80.1M/wk | github.com/vitejs/vite-plugin-react | SUS (recency flag only) | Flagged — checkpoint:human-verify if installed this phase |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** jose (already installed — bump only; checkpoint optional), vitest-mock-extended, @vitejs/plugin-react. All three flags stem from the seam's publish-date recency heuristic on major, long-established packages with 1M–113M weekly downloads and verifiable source repos — the [SUS] disposition for `vitest-mock-extended` and `@vitejs/plugin-react` still requires a `checkpoint:human-verify` task before install per protocol.

*All package names verified against the npm registry on 2026-08-11 (see Version verification above).*

## Architecture Patterns

### System Architecture Diagram — Authentication Request Path (after Phase 1)

```text
 Browser
   │  GET /assets  (no cookie)            │  POST /api/assets  (no cookie)
   ▼                                      ▼
 proxy.ts (deny-by-default gate)          proxy.ts
   ├─ PUBLIC_PATHS?  /, /login, /register, /api/auth/{login,register}  ──► pass through
   ├─ no/invalid token + page route  ──► 302 /login?redirect=/assets
   └─ no/invalid token + /api/*     ──► 401 JSON
                                          │  valid token (stateless jwtVerify only — no DB)
                                          ▼
                                 route handler / server action / layout
                                          │  getCurrentUser()
                                          │   ├─ jwtVerify (iss/aud/alg pinned)  ──fail──► null
                                          │   ├─ db.user.findUnique(id).tokenVersion ──mismatch──► null (401)
                                          │   └─ strict parseClaims() → JWTPayload (typed, no index sig)
                                          ▼
                              requireUser()/requireRole()  (Phase 2 adds requireRole)
                                          │  data mutations via Prisma (db singleton)
                                          ▼
                                     PostgreSQL (User.tokenVersion @default(0))
```

### Recommended Project Structure (new/changed files)

```text
lib/
├── env.ts                 # NEW — requireEnv(name) fail-fast assertion (module-load)
├── auth.ts                # REWRITE — strict JWTPayload, pinned sign/verify, tokenVersion check,
│                          #   assertUser()/getUserIdentity(), bumpTokenVersion()
├── db.ts                  # unchanged (singleton)
proxy.ts                   # REWRITE — PUBLIC_PATHS allow-list, deny-by-default, 401 vs redirect
app/api/auth/register/route.ts  # EDIT — drop body role, hardcode EMPLOYEE
app/api/auth/logout/route.ts    # EDIT — optionally add logout-all (bump tokenVersion)
app/api/users/[id]/route.ts     # EDIT — bump tokenVersion on password change
app/(authenticated)/layout.tsx  # EDIT — redirect("/login") when getCurrentUser() null
prisma/schema.prisma            # EDIT — User.tokenVersion Int @default(0)
vitest.config.ts           # NEW
vitest.setup.ts            # NEW — redirect-throws + async cookies() mocks
tests/  (or colocated *.test.ts)
├── lib/auth.test.ts       # NEW — TEST-02: env throw, iss/aud pinning, tokenVersion
└── api/auth/register.test.ts  # NEW — TEST-02: role pinning via mockDeep
```

### Pattern 1: Fail-fast environment assertion (SEC-01)

**What:** A `requireEnv(name)` helper that throws at module load; `lib/auth.ts` calls it at module top so the secret is read once and never defaults.
**When to use:** Any required server secret. Module-load throw fails `next dev` (first compile that imports lib/auth — verified lib/auth is imported only by server modules: proxy, 25 API/server files, no `"use client"` component), fails `next build` (route handlers import it), and `next start`. Optional belt-and-braces: `instrumentation.ts` `register()` runs once at server init before first request (verified: Next skips it during `NEXT_PHASE=phase-production-build`), so it asserts at process start but cannot guard the build.
**Example:**
```typescript
// lib/env.ts
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}
```
```typescript
// lib/auth.ts (module top — replaces lib/auth.ts:8 fallback)
import { requireEnv } from "@/lib/env";
const JWT_SECRET = requireEnv("JWT_SECRET");
```

### Pattern 2: Pinned sign/verify with jti (SEC-03)

**What:** Sign with issuer/audience/jti/iat/exp; verify with `issuer`, `audience`, `algorithms: ['HS256']`. `jti = crypto.randomUUID()` (Node global; also available via Web Crypto).
**When to use:** Every token this app issues or verifies — one place, `lib/auth.ts`.
**Example (source: jose official JSDoc, Context7 /panva/jose):**
```typescript
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";

const TOKEN_ISSUER = "eams";
const TOKEN_AUDIENCE = "eams-web";

export async function generateToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload, jti: randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify<JWTPayload>(token, JWT_SECRET, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      algorithms: ["HS256"],
    });
    return parseClaims(payload);
  } catch (error) {
    // error.code is stable: ERR_JWT_EXPIRED | ERR_JWT_CLAIM_VALIDATION_FAILED | ERR_JOSE_ALG_NOT_ALLOWED | ...
    return null;
  }
}
```

### Pattern 3: Typed identity without index signature (BUG-01)

**What:** The index signature `[key: string]: unknown` on `JWTPayload` is what let `user.id` compile. Remove it; type the jose boundary explicitly.
**When to use:** Any code touching the JWT payload. Note: jose's own `JWTPayload` type carries an index signature, so the strict interface cannot be passed directly to `new SignJWT(...)` — the single controlled cast lives inside `generateToken`. On verify, `jwtVerify<JWTPayload>` (the function is generic) returns the payload typed as the strict interface, so `.id` no longer compiles.
**Example:**
```typescript
import type { JWTPayload as JoseJWTPayload } from "jose";

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  tokenVersion: number;
}

/** Runtime validator — claims from a token are untrusted, even after signature verify. */
export function parseClaims(value: unknown): JWTPayload | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.userId === "string" &&
    typeof v.email === "string" &&
    typeof v.fullName === "string" &&
    typeof v.tokenVersion === "number" &&
    typeof v.role === "string" &&
    Object.values(UserRole).includes(v.role as UserRole)
  ) {
    return value as JWTPayload;
  }
  return null;
}

/** Throws when unauthenticated — route-handler convenience (pair with 401 response in caller). */
export function assertUser(user: JWTPayload | null): asserts user is JWTPayload {
  if (!user) throw new Error("Unauthorized");
}

/** Null-safe identity accessor for optional-context code. */
export function getUserIdentity(user: JWTPayload | null): JWTPayload | null {
  return user ? parseClaims(user) : null;
}
```
Callers then fix the two live bug sites to use `user.userId` (compile-enforced):
```typescript
// app/api/bast/[id]/approve/route.ts:31  →  approverId: user.userId
// app/api/assets/[id]/return/route.ts:47 →  creatorId: user.userId
```

### Pattern 4: Deny-by-default proxy + layout redirect (SEC-05)

**What:** Invert from "list of protected prefixes" to "explicit public allow-list"; everything else requires a valid token. Pages → 302 `/login?redirect=...`; `/api/*` → 401 JSON. Keep the proxy stateless (`verifyToken` only — no DB) so it stays a fast gate; handlers enforce revocation.
**When to use:** Next.js 16 renamed `middleware.ts` → `proxy.ts` (named export `proxy`); official authentication guide uses exactly this public/protected split. The matcher stays broad (exclude static only) and the allow-list lives in the proxy body — one obvious place to maintain.
**Example (source: Next.js 16 official authentication guide + proxy.mdx, Context7 /vercel/next.js):**
```typescript
// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TOKEN_NAME, verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/api/auth/login", "/api/auth/register"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(TOKEN_NAME)?.value;
  const user = token ? await verifyToken(token) : null; // stateless; tokenVersion check lives in getCurrentUser

  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```
```typescript
// app/(authenticated)/layout.tsx — first line of the async layout
const user = await getCurrentUser();
if (!user) redirect("/login"); // defense in depth; proxy already redirects
```
Removal candidates while rewriting: the dead `x-user-id`/`x-user-role` header plumbing (`proxy.ts:49-54` — no handler reads them; verified via grep) and the stale `middleware.ts` references in `BACKEND_README.md`.

### Pattern 5: tokenVersion revocation (SEC-04)

**What:** `User.tokenVersion Int @default(0)`. Sign the current value into the token; on `getCurrentUser()`, after signature/claims verify, load `{ tokenVersion, role }` from the DB and reject on mismatch (401). `bumpTokenVersion(userId)` increments on password change and logout-all — every previously issued token is dead on its next request.
**When to use:** The requirement mandates it. Cost: one indexed PK read per authenticated request (`select: { tokenVersion: true, role: true }`) — the standard, documented cost of the pattern; it is cacheable with a short TTL later. Do NOT put the DB check in `verifyToken()` — that would drag the proxy into the DB and break its role as a fast gate; keep `verifyToken` pure and add the version check in `getCurrentUser()`.
**Example (pattern per jsonic.io 2026-05-23, adapted to this stack):**
```typescript
// prisma/schema.prisma — User model
tokenVersion Int @default(0)

// lib/auth.ts
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { tokenVersion: true, role: true },
  });
  if (!user || user.tokenVersion !== payload.tokenVersion) return null; // stale/revoked → 401
  return { ...payload, role: user.role }; // fresh role from DB, not the token
}

export async function bumpTokenVersion(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}
```
Wire `bumpTokenVersion` into: password change (`app/api/users/[id]/route.ts` PATCH path that calls `hashPassword`) and the logout-all endpoint added this phase (`POST /api/auth/logout-all` — clears cookie + bumps version; the existing `POST /api/auth/logout` stays cookie-only so "log out this browser" doesn't kill other sessions).

### Pattern 6: Vitest infrastructure (TEST-01)

**What:** `vitest.config.ts` with `@/*` alias + `environment: 'node'`; `vitest.setup.ts` bakes the two mocks every auth test needs. All mocks are hoisted-safe (`vi.hoisted` / factory-defined).
**When to use:** This is the project's first test infra; Phase 2+ suites build on it.
**Example (source: Vitest docs — resolve.alias / test.alias; vitest-mock-extended README — mockDeep):**
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
```
```typescript
// vitest.setup.ts
import { vi } from "vitest";

// next/headers cookies() is ASYNC since Next 15 — a sync mock silently misbehaves.
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
}));

// Real redirect() throws NEXT_REDIRECT; a no-op mock lets code after redirect run (false positives).
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));
```
```typescript
// per-test-file Prisma deep mock — do NOT hand-roll a 5-method stub
import { mockDeep } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

const prismaMock = vi.hoisted(() => mockDeep<PrismaClient>());
vi.mock("@/lib/db", () => ({ db: prismaMock, default: prismaMock }));
```

### Anti-Patterns to Avoid

- **Testing the env-throw via a stale module cache:** module-load state persists across tests — use `vi.resetModules()` + `vi.stubEnv()` + dynamic `import()` so the module is re-evaluated (see Code Examples).
- **Adding the tokenVersion DB check to `verifyToken()`:** drags PostgreSQL into the proxy hot path and breaks `proxy.ts` as a stateless gate; the version check belongs in `getCurrentUser()`.
- **Re-adding an index signature "for jose compatibility":** the strict interface + one cast at `generateToken` is the whole point of BUG-01; an `extends JoseJWTPayload` inheritance trick re-imports the index signature and resurrects the bug class.
- **Allow-list with prefix matching:** `pathname.startsWith("/api")` for public routes would open `/api/auth/login/../admin`-style lookalikes; use exact `Set` membership for public paths and `startsWith("/api")` only to decide 401-vs-redirect.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT sign/verify | Custom HMAC signing, `jsonwebtoken` | jose `SignJWT` / `jwtVerify` | Pinned claims + stable error codes + key-length checks already implemented and audited. |
| Token IDs (jti) | Counter/`Date.now()`-derived ids | `crypto.randomUUID()` | UUIDv4 is the standard for token IDs; no collision reasoning needed. |
| Deep mocks of Prisma | Manual 5-method mock + `toHaveBeenCalledWith` asserts | `mockDeep<PrismaClient>()` | 200+ methods exist without maintenance; refactors don't break mock plumbing. |
| Env assertion | Defaulted secret / silent `undefined` | `requireEnv()` throw | Fail-fast with a clear message; no fallback string anywhere. |
| `next/navigation` redirect in tests | `vi.fn()` no-op | Throw `NEXT_REDIRECT` inside the mock | A returning mock produces false-green "redirected" tests while code after redirect mutates data. |

**Key insight:** The two most damaging patterns in this codebase (forged sessions, privilege escalation) are hand-rolled conveniences — a default secret and a body-role cast. Every one of these rows is a place where "the obvious few lines" hide real attack surface.

## Runtime State Inventory

> Included because this phase changes token semantics and the User schema — live-state compatibility matters even though no string is renamed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Prisma has NO migrations directory (`prisma/` contains only `schema.prisma` + `seed.ts` — the DB was set up via `db push`). Adding `User.tokenVersion` changes the schema. | Schema change via `npx prisma db push` (consistent with existing workflow) or establish a migrations baseline (`prisma migrate dev --name init`) as a deliberate new workflow. No data backfill needed (`@default(0)`). |
| Live service config | None — no external services store tokens or auth config. | None. |
| OS-registered state | None — no scheduled tasks/services reference auth internals. | None. |
| Secrets/env vars | **No `.env` exists in the working tree** (verified: `Test-Path .env` = False; no `.env*` files) and `JWT_SECRET`/`DATABASE_URL` are unset in the shell. The Phase-1 fail-fast will make the app refuse to run until `JWT_SECRET` is provided. | Create `.env` with `JWT_SECRET` (≥ 32 bytes random, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), plus existing `DATABASE_URL`/`DIRECT_URL`. Planner: add an explicit task; verify the throw first with env unset, then set env and re-run. |
| Build artifacts | `node_modules/.prisma/client` regenerates on `npx prisma generate`; stale generated client from the 6.19.0/6.19.3 mismatch disappears after DATA-02 alignment. | `npx prisma generate` after the version alignment. |
| Existing user sessions | Every currently issued `auth-token` cookie lacks `iss`/`aud`/`jti`/`tokenVersion` claims → after Phase 1 deploy, ALL existing sessions are rejected (401 / redirect to login). | Intended consequence of SEC-03/SEC-04 (forced re-login once). Operational note for the user; no data migration. |

## Common Pitfalls

### Pitfall 1: The module-load throw breaks the client bundle
**What goes wrong:** If any `"use client"` component ever imports `lib/auth.ts` (directly or transitively), the `requireEnv` throw fires during client compilation.
**Why it happens:** `lib/auth.ts` feels like "shared auth utils" — it already imports `next/headers`, which is server-only, but the boundary is invisible.
**How to avoid:** Verified today: only server modules import lib/auth (proxy.ts, 25 API/server files, server pages/layouts). Keep it that way — add a lint rule or a `server-only` import (`import "server-only"`) as a cheap guard.
**Warning signs:** A "use client" file importing from `@/lib/auth`; `next build` failing with "Missing required environment variable" during client compilation.

### Pitfall 2: `verifyToken` returning `payload as JWTPayload` without runtime claim validation
**What goes wrong:** A validly signed token with `role: "BOGUS"` or a missing `tokenVersion` passes; `parseClaims` exists precisely because claims are untrusted after verify.
**Why it happens:** Signature validity is confused with claim validity.
**How to avoid:** Always route the verified payload through `parseClaims()`; unit-test a malformed-claims token.
**Warning signs:** No test for a signed-but-malformed payload.

### Pitfall 3: Removing the index signature breaks `new SignJWT(payload)` typing
**What goes wrong:** `TypeError`-style TS errors or a frustrated revert of BUG-01.
**Why it happens:** jose's own `JWTPayload` type has `[propName: string]: unknown`; a strict interface is not assignable without a boundary cast.
**How to avoid:** One controlled cast inside `generateToken` (`{ ...payload } as JoseJWTPayload`) — never a cast at consumption sites.
**Warning signs:** `as unknown as` casts scattered in route handlers.

### Pitfall 4: Deny-by-default surprises — the print page and new routes
**What goes wrong:** `app/bast/[id]/print/page.tsx` (outside the `(authenticated)` group) becomes proxy-protected; any future public page forgets to join `PUBLIC_PATHS`.
**Why it happens:** Inverting the matcher changes the default for routes nobody remembered.
**How to avoid:** The print page already self-guards with `redirect("/login")` (verified) so proxy protection is behavior-neutral for it. Add a comment on `PUBLIC_PATHS` ("every entry here is a deliberate public route") and a unit test asserting the allow-list contents.
**Warning signs:** Anonymous requests to `/bast/[id]/print` return 302 after the change.

### Pitfall 5: The revocation check skipping the proxy makes logout "feel broken"
**What goes wrong:** Logout-all bumps tokenVersion; the user's next page click still renders the shell because the proxy's stateless `verifyToken` passes, then the layout's `getCurrentUser()` returns null and redirects — a flash of the authenticated shell.
**Why it happens:** Proxy (stateless) and handler (stateful) disagree for one round-trip.
**How to avoid:** Accept the flash (proxy is a gate, not the authority); the layout redirect (SEC-05) makes the end state correct. Do not add DB checks to the proxy to "fix" this.
**Warning signs:** Tests asserting the proxy itself rejects stale-version tokens (it shouldn't — that's `getCurrentUser`'s job).

### Pitfall 6: `next/headers` cookie mocks returning a sync store
**What goes wrong:** `cookies()` is async since Next 15; a sync mock either type-crashes or silently returns `undefined` for `.get()`.
**How to avoid:** The setup-file mock resolves to an object exposing `get/set/delete`; per-test, override with `vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: token }), ... })`.
**Warning signs:** `cookieStore.get` undefined errors in tests.

### Pitfall 7: `redirect()` mocked as a no-op
**What goes wrong:** A "redirects to /login" test passes while the code after redirect continues and mutates data.
**How to avoid:** The setup mock throws `NEXT_REDIRECT`; assert `rejects.toThrow(/NEXT_REDIRECT/)` + `expect(redirect).toHaveBeenCalledWith("/login")`.
**Warning signs:** Any test file that re-mocks `next/navigation` with `vi.fn()`.

### Pitfall 8: Version mismatch warnings after DATA-02
**What goes wrong:** Prisma CLI 6.19.3 + client 6.19.0 drift shows version-mismatch warnings and the generated client can lag schema changes.
**How to avoid:** Align to 6.19.3 in one install command, then `npx prisma generate`; never update one without the other.
**Warning signs:** "prisma CLI version does not match @prisma/client" warnings in dev output.

## Code Examples

### Common Operation 1 — Asserting the env throw in a test (TEST-02)
```typescript
// tests/lib/auth.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("JWT_SECRET fail-fast (SEC-01)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("throws when JWT_SECRET is unset", async () => {
    vi.stubEnv("JWT_SECRET", "");
    await expect(import("@/lib/auth")).rejects.toThrow(/JWT_SECRET/);
  });

  it("loads when JWT_SECRET is set", async () => {
    vi.stubEnv("JWT_SECRET", "a".repeat(64));
    const mod = await import("@/lib/auth");
    expect(mod).toBeDefined();
  });
});
```

### Common Operation 2 — Wrong issuer/audience rejected (TEST-02, SEC-03)
```typescript
it("rejects a token with the wrong issuer", async () => {
  vi.stubEnv("JWT_SECRET", "a".repeat(64));
  const { verifyToken } = await import("@/lib/auth");
  const { SignJWT } = await import("jose");

  const forged = await new SignJWT({ userId: "u1", email: "a@b.c", role: "SUPER_ADMIN", fullName: "X", tokenVersion: 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("attacker") // wrong issuer
    .setAudience("eams-web")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode("a".repeat(64)));

  await expect(verifyToken(forged)).resolves.toBeNull();
});
```

### Common Operation 3 — Register with SUPER_ADMIN body → stored EMPLOYEE (TEST-02, SEC-02)
```typescript
// tests/api/auth/register.test.ts
import { NextRequest } from "next/server";
import { mockDeep } from "vitest-mock-extended";
import type { PrismaClient, UserRole } from "@prisma/client";

const prismaMock = vi.hoisted(() => mockDeep<PrismaClient>());
vi.mock("@/lib/db", () => ({ db: prismaMock, default: prismaMock }));

it("stores EMPLOYEE even when body requests SUPER_ADMIN", async () => {
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.create.mockImplementation(async ({ data }) => ({
    id: "u1", email: data.email as string, fullName: data.fullName as string,
    password: "hash", nip: null, role: data.role as UserRole, divisionId: null,
    createdAt: new Date(), updatedAt: new Date(), tokenVersion: 0,
  }));

  const { POST } = await import("@/app/api/auth/register/route");
  const res = await POST(new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: "u@x.com", password: "pw12345678", fullName: "U", role: "SUPER_ADMIN" }),
  }));

  expect(prismaMock.user.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ role: "EMPLOYEE" }) }),
  );
  const json = await res.json();
  expect(json.data.role).toBe("EMPLOYEE");
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` / `middleware` export | `proxy.ts` / `proxy` export (Next 16) | Next 16 (this project already complies) | Rename drift in docs/tutorials; codemod `npx @next/codemod@canary middleware-to-proxy` exists |
| JWT verify with secret only | `jwtVerify(token, key, { issuer, audience, algorithms })` | jose v3+; standard since | Prevents cross-context token reuse and alg confusion |
| Stateless JWT, no revocation | `tokenVersion` claim + DB compare (or jti denylist / session table) | industry-standard since ~2020; documented 2026 guides | Password change / logout-all now kills tokens; cost = 1 DB read |
| Jest for TS/ESM apps | Vitest 4 (Vite-native) | Vitest 4 GA | ESM + TS zero-config; Prisma's 2026 testing guidance is Vitest-first |
| Prisma 6 | Prisma 7 (7.9.1 current) | 2026 | **Out of scope** (generator/client layout change); Prisma 6.19.x fully supports everything Phase 1 needs |

**Deprecated/outdated:**
- `middleware.ts` filename: Next 16 — use `proxy.ts`; grep the repo for stale references (`BACKEND_README.md`).
- `jsonwebtoken`: legacy; jose is the maintained standard.
- jest-mock-extended: Jest-only — use vitest-mock-extended 5.x under Vitest.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | jose enforces a ≥ 32-byte key for HS256 at sign/verify time | Standard Stack / SEC-01 | [ASSUMED — prior milestone research states it; Context7 verified only the RSA 2048-bit check]. If jose doesn't enforce HMAC length, a short secret still works — recommend adding an explicit `JWT_SECRET.length >= 32` assertion in `requireEnv` callers regardless. |
| A2 | The project's DB workflow is `prisma db push` (no migrations dir exists) | Runtime State Inventory | [VERIFIED — no `prisma/migrations/` folder]. If the team actually uses migrations elsewhere, `db push` on a migrated DB is harmless for a nullable/defaulted column but should be confirmed with the user before running. |
| A3 | Absence of `.env` is a local dev gap, not a CI secret vault | Environment Availability | [ASSUMED]. If secrets live in an external vault/CI, the "create .env" task is dev-only; the fail-fast test must still run with stubbed env. |
| A4 | `jwtVerify<JWTPayload>` (strict, no index signature) types the returned payload so `.id` fails to compile | Architecture Patterns | [MEDIUM — jose's generic signature `jwtVerify<PayloadType>` + `JWTVerifyResult<PayloadType>` verified via Context7; the exact inferred claim intersection not re-verified against installed 6.2.8 typings]. If inference still intersects jose's index-signatured `JWTPayload`, cast the result inside `parseClaims` only. |
| A5 | `proxy.ts` runs on the Node.js runtime (not edge) in Next 16 | Architecture Patterns | [ASSUMED — prior milestone research states proxy.ts is Node runtime in Next 16; if edge, `crypto.randomUUID()` and any node-only imports in lib/auth would break the proxy — the proxy should import only what the edge runtime supports]. |
| A6 | Logout-all endpoint does not yet exist; logout is cookie-clear only | Runtime State Inventory | [VERIFIED — `app/api/auth/logout/route.ts` clears the cookie]. Requirement SEC-04 needs a logout-all path; endpoint shape (new route vs query param) is planner's call. |

## Open Questions

1. **Migrations baseline vs `db push` for the `tokenVersion` column**
   - What we know: no `prisma/migrations/` directory exists; schema was applied via `db push` (assumption A2).
   - What's unclear: whether the team wants to introduce `prisma migrate` discipline in this milestone.
   - Recommendation: `npx prisma db push` for the single additive column (keeps the milestone focused); flag "introduce migrations baseline" as a closing-phase task.

2. **Logout-all endpoint shape**
   - What we know: SEC-04 requires logout-all invalidation; only cookie-clearing logout exists.
   - What's unclear: dedicated `POST /api/auth/logout-all` vs `?all=1` on the existing route.
   - Recommendation: dedicated `POST /api/auth/logout-all` (clear cookie + `bumpTokenVersion`) — explicit and testable; single-session logout stays cookie-only.

3. **Keep or delete the dead `x-user-id`/`x-user-role` proxy headers**
   - What we know: set at `proxy.ts:49-54`, read by zero handlers (grep-verified).
   - What's unclear: any planned consumer (Phase 2 `requireUser()` could use them, but handlers already have `getCurrentUser()`).
   - Recommendation: delete during the SEC-05 rewrite; re-introduce only if a concrete consumer appears.

4. **`eslint-config-next` 16.1.6 vs `next` 16.3.0 drift**
   - What we know: lint config lags the framework (prior research Pitfall 14).
   - What's unclear: whether to absorb the bump here (one line) or defer to the closing phase.
   - Recommendation: defer to the closing phase unless Phase 1 introduces lint failures.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next 16 runtime, Vitest | ✓ | v24.1.0 (Next 16 requires ≥18.18) | — |
| npm | installs | ✓ | 11.6.4 | — |
| PostgreSQL | Prisma client generation / runtime | ✗ (not probed: no `pg_isready`, Docker not available) | — | Unit tests (TEST-01/02) use `mockDeep<PrismaClient>` and do NOT need a live DB; runtime verification (`next dev` + login flow) needs a reachable PG |
| `.env` with `JWT_SECRET` + `DATABASE_URL` + `DIRECT_URL` | app boot (mandatory after SEC-01) | ✗ (no `.env` in tree; shell env unset) | — | Create `.env` as a Phase-1 task; `JWT_SECRET` ≥ 32 bytes via `crypto.randomBytes(32).toString("hex")` |
| Git | workflow | ✓ | repo clean except `.planning/` + ignore/config edits | — |

**Missing dependencies with no fallback:**
- `.env` secrets (JWT_SECRET, DATABASE_URL, DIRECT_URL) — the app will refuse to start after SEC-01 until `JWT_SECRET` is set. Planner must include an explicit env-setup + verification task, and the TEST-02 "env missing → throws" test must run with `vi.stubEnv`, not by unsetting the real env.

**Missing dependencies with fallback:**
- PostgreSQL for runtime smoke-testing — TEST-01/02 are DB-free (mockDeep); the phase gate can run unit tests without PG, but `npx prisma generate` and any manual `next dev` login check require the DB. Mark the manual login smoke test as dependent on the developer's local PG.

## Validation Architecture

> Skipped per `.planning/config.json`: `workflow.nyquist_validation` is explicitly `false`. Validation requirements are nonetheless embedded in the phase requirements (TEST-01/TEST-02) and the Security Domain section below. If the planner re-enables validation, the test map is: TEST-02 unit suite = the phase's automated evidence.

## Security Domain

> `workflow.security_enforcement: true` (ASVS level 1) — this section is required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | jose `jwtVerify` pinned iss/aud/alg + `tokenVersion` revocation; bcryptjs 12 rounds (unchanged) |
| V3 Session Management | yes | httpOnly/secure/sameSite=lax cookie (unchanged); revocation via `tokenVersion`; forced re-login on version bump |
| V4 Access Control | partial (Phase 2 completes) | Phase 1 delivers typed identity + `assertUser()` (401); full `requireRole()` matrix is SEC-06/07 in Phase 2 |
| V5 Input Validation | yes | registration: drop body `role`, hardcode EMPLOYEE; keep required-field checks; zod `.strict()` rollout is Phase 2 (SEC-08) |
| V6 Cryptography | yes | jose HS256 with ≥32-byte secret — never hand-rolled crypto; key length enforced by jose; no fallback secret |

### Known Threat Patterns for {jose JWT + Next.js 16 proxy}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged session via hardcoded fallback secret (CWE-798) | Spoofing | `requireEnv("JWT_SECRET")` module-load throw; no default anywhere; jose key-length check |
| Privilege escalation via public registration body role (CWE-269) | Elevation | server-side `role: UserRole.EMPLOYEE` literal; delete body `role` destructure |
| Cross-context token reuse (same key, wrong app) | Spoofing | pin `issuer: "eams"`, `audience: "eams-web"`, `algorithms: ["HS256"]` on every verify |
| Replay of revoked tokens after password change/logout-all | Spoofing | `tokenVersion` claim vs DB compare in `getCurrentUser()`; `bumpTokenVersion()` on revocation events |
| Middleware-only auth bypass (CVE-2025-29927 class) | Tampering | proxy = gate only; every handler/layout re-verifies via `getCurrentUser()`; layout redirect |
| Stale-token claim trust (`user.id` undefined; malformed role) | Spoofing | strict `JWTPayload` (no index signature) + `parseClaims()` runtime validator + enum check |

## Sources

### Primary (HIGH confidence)
- Context7 /panva/jose — `jwtVerify` JWTVerifyOptions (issuer/audience/algorithms), `SignJWT` setters (iss/aud/jti/iat/exp), generic `jwtVerify<PayloadType>`, stable error codes (`ERR_JWT_CLAIM_VALIDATION_FAILED`, `ERR_JOSE_ALG_NOT_ALLOWED`, `ERR_JWT_EXPIRED`), exp/nbf auto-validation
- Context7 /vercel/next.js (v16 docs) — `proxy.ts` file convention (middleware rename, `proxy` export, matcher), official authentication guide (public/protected route arrays, redirect to /login, 401 JSON for APIs), `middleware-to-proxy` codemod, `instrumentation.ts` `register()` (skipped during `phase-production-build`; runs once at server init)
- Context7 /vitest-dev/vitest (v4 docs) — `resolve.alias` / `test.alias` for path aliases, `environment: 'node'`, vi.mock resolution through the plugin container
- Context7 /eratio08/vitest-mock-extended — `mockDeep<PrismaClient>()` → `DeepMockProxy`, `mockReset`/`mockClear`, `vi.mock` module pattern
- Context7 /prisma/web — keep `prisma` CLI and `@prisma/client` in lockstep; update both then `npx prisma generate`
- npm registry `npm view` 2026-08-11 — jose 6.2.8, next 16.3.0, vitest 4.1.10, vitest-mock-extended 5.1.1, supertest 7.2.2, @vitejs/plugin-react 6.0.5, prisma/@prisma/client 6.19.3 (latest 6.x)
- Project codebase (grep/read) — `lib/auth.ts`, `proxy.ts`, register/login/logout routes, `(authenticated)/layout.tsx`, `bast/[id]/approve/route.ts:31`, `assets/[id]/return/route.ts:47`, `prisma/schema.prisma`, `package.json`, `tsconfig.json` (no client imports of lib/auth; no migrations dir; no .env)

### Secondary (MEDIUM confidence)
- getlaunchpad.net — "How to manage environment variables in Next.js (the right way)" 2026-04-08 — `requireEnv` module-load fail-fast pattern; instrumentation.ts startup check (cross-checked with Context7 instrumentation docs)
- jsonic.io — "JWT Revocation Strategies" 2026-05-23 — tokenVersion pattern: `Int @default(0)`, claim compare, increment on revocation, 1-DB-read-per-request cost, cacheability
- easyjwt.top — "JWT Token Revocation" 2025-07-10 — tokenVersion + jti combination, verify middleware shape
- Prior milestone research (`.planning/research/STACK.md`, `PITFALLS.md`, 2026-08-10) — jose HS256 key-length, proxy-as-gate guidance, redirect-mock-throws rule, mockDeep guidance, Prisma drift warning

### Tertiary (LOW confidence)
- WebSearch-only synthesis (fail-fast best practice, tokenVersion cost/benefit) — marked `[ASSUMED]` in the Assumptions Log where load-bearing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-08-11; libraries cross-checked in official docs via Context7
- Architecture: MEDIUM-HIGH — proxy/allow-list, jose pinning, tokenVersion, and Vitest patterns verified against official docs; jose typing nuance (A4) and proxy runtime (A5) carry residual assumption
- Pitfalls: MEDIUM — grounded in project code evidence (grep) + prior milestone research; runtime behaviors (flash-of-shell, print-page redirect) reasoned, not yet executed

**Research date:** 2026-08-11
**Valid until:** 2026-09-10 (30 days — versions re-verified 2026-08-11; Next/jose/vitest are fast-moving)
