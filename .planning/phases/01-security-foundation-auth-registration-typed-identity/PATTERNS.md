# Phase 1: Security Foundation — Auth, Registration & Typed Identity — Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 14 planned changes
**Analogs found:** 10 / 14 (4 greenfield test-infra files have no in-repo analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/auth.ts` (modify) | utility (auth domain) | request-response | `lib/auth.ts` (self) + `lib/db.ts` env pattern | exact |
| `lib/auth.ts` — add `assertUser()`/`getUserIdentity()` | utility | request-response | `lib/actions/bast-actions.ts:29-32` throw pattern | role-match |
| `app/api/auth/register/route.ts` (modify) | route/controller | request-response (public) | `app/api/users/route.ts` POST (admin create) | exact |
| `app/api/auth/logout-all/route.ts` (new) | route/controller | request-response | `app/api/auth/logout/route.ts` + `app/api/auth/me/route.ts` | exact |
| `proxy.ts` (modify) | middleware | request-response (gate) | `proxy.ts` (self) | exact |
| `app/(authenticated)/layout.tsx` (modify) | component (server layout) | request-response | `app/(authenticated)/history/page.tsx:7-8` self-guard | exact |
| `prisma/schema.prisma` (modify) + 1st migration (new) | model/config | CRUD | `prisma/schema.prisma` User model (self) | exact |
| `app/api/bast/[id]/approve/route.ts` (modify) | route/controller | CRUD | `app/api/bast/route.ts:143` (correct `user.userId`) | exact |
| `app/api/assets/[id]/return/route.ts` (modify) | route/controller | CRUD | `lib/actions/bast-actions.ts:68,163` (correct `user.userId`) | exact |
| `package.json` (modify) | config | — | `package.json` (self) | exact |
| `vitest.config.ts` (new) | config (test infra) | — | none — see `.planning/research/PITFALLS.md` P11/P12 | no analog |
| `vitest.setup.ts` (new) | config (test infra) | — | none — research-backed | no analog |
| `tests/auth.test.ts` (new) | test | — | none — research-backed | no analog |
| `tests/register.test.ts` (new) | test | — | none — research-backed | no analog |

---

## Pattern Assignments

### `lib/auth.ts` (modify — SEC-01, SEC-03, SEC-04, BUG-01)

**Analog:** `lib/auth.ts` (self) — the entire module is the anti-pattern being hardened; copy its structure (JSDoc per export, `TOKEN_NAME` constant, named exports) and rewrite the three hot spots. Module-load env-read pattern from `lib/db.ts:14,17`.

**SEC-01 — fail-fast secret (replace `lib/auth.ts:8`):**
```typescript
// lib/auth.ts:8 (CURRENT — REMOVE)
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production");
```
```typescript
// REPLACE WITH (module-load assertion, pattern from lib/db.ts:14,17 which reads env at module scope)
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required. Set it in .env before starting the app.");
}
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);
```
Note: `lib/db.ts` reads `process.env.NODE_ENV` at module load (`lib/db.ts:14,17`) — module-scope env assertion is an established convention here; this is the same shape with a throw. The first unit test (TEST-02) must assert this throws when env is unset.

**SEC-03 — pinned token issuance/verification (modify `lib/auth.ts:37-43` and `lib/auth.ts:48-61`):**
```typescript
// generateToken — add issuer/audience/jti (lib/auth.ts:37-43 currently has only alg+iat+exp)
import { randomUUID } from "node:crypto";
// ...
return new SignJWT(payload)
  .setProtectedHeader({ alg: "HS256" })
  .setIssuer("eams")
  .setAudience("eams-web")
  .setJti(randomUUID())
  .setIssuedAt()
  .setExpirationTime("7d")
  .sign(SECRET_KEY);
```
```typescript
// verifyToken — pin every claim (lib/auth.ts:50 currently: jwtVerify(token, SECRET_KEY))
const { payload } = await jwtVerify(token, SECRET_KEY, {
  issuer: "eams",
  audience: "eams-web",
  algorithms: ["HS256"],
});
```
Keep the existing required-field shape check at `lib/auth.ts:53` (userId/email/role/fullName as strings). Keep `catch → return null` at `lib/auth.ts:58-60` — the null-on-failure contract is depended on by `proxy.ts:30` and `getCurrentUser`.

**SEC-04 — tokenVersion (split stateless verify vs fresh-DB check):**
```typescript
// JWTPayload gains tokenVersion: number; used to reject revoked tokens
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  tokenVersion: number;
  // [key: string]: unknown;  ← REMOVED (BUG-01 — this index signature let user.id compile)
}
```
`verifyToken` stays **stateless** (signature + pinned claims only) — `proxy.ts:30` calls it and must stay DB-free (PITFALLS.md P4 line 98). The `tokenVersion` DB comparison lives in `getCurrentUser()` (the handler/action entry point), following the "verify → fresh DB read" pattern of `app/api/auth/me/route.ts:14-32`:
```typescript
// getCurrentUser (lib/auth.ts:80-89) — after verifyToken succeeds, compare against DB
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME);
  if (!token) return null;

  const payload = await verifyToken(token.value);
  if (!payload) return null;

  // Fresh DB check: tokenVersion mismatch → revoked token → 401 (SEC-04)
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { tokenVersion: true },
  });
  if (!user || user.tokenVersion !== payload.tokenVersion) return null;

  return payload;
}
```
**Auth/guard pattern:** `proxy.ts` consumes `verifyToken` (stateless); every handler/action/layout consumes `getCurrentUser` (with revocation check). This preserves the double-verification design noted in ARCHITECTURE.md while adding the revocation layer.

**BUG-01 — typed identity helpers (add to `lib/auth.ts`):**
```typescript
// Throw-style guard — copy the "Unauthorized" throw contract from lib/actions/bast-actions.ts:29-32
export async function assertUser(): Promise<JWTPayload> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user; // typed — user.id no longer compiles once index signature is gone
}

export function getUserIdentity(user: JWTPayload): { userId: string; email: string; role: UserRole; fullName: string; tokenVersion: number } {
  return { userId: user.userId, email: user.email, role: user.role, fullName: user.fullName, tokenVersion: user.tokenVersion };
}
```
Follow existing JSDoc convention: `/** ... */` block above every exported function (CONVENTIONS.md line 84, matches `lib/auth.ts` style). Note `"use server"` is NOT used in `lib/auth.ts` — do not add it.

**Error handling:** `verifyToken` returns `null` on failure (existing contract at `lib/auth.ts:58-60`) — do not switch to throwing inside `verifyToken`; `assertUser()` is the throwing boundary.

---

### `app/api/auth/register/route.ts` (modify — SEC-02)

**Analog:** `app/api/users/route.ts` POST (`app/api/users/route.ts:101-170`) — the admin create-user endpoint that legitimately sets role; it shares the exact validation/dup-check/create shape with register. Copy the shape, change only the role line.

**SEC-02 — strip role from body (modify `app/api/auth/register/route.ts:11,48`):**
```typescript
// line 11 (CURRENT): const { email, password, fullName, nip, role, divisionId } = body;
// REPLACE WITH — role is never read from the body on self-registration:
const { email, password, fullName, nip, divisionId } = body;
```
```typescript
// line 48 (CURRENT): role: (role as UserRole) || UserRole.EMPLOYEE,
// REPLACE WITH:
role: UserRole.EMPLOYEE, // hardcoded — self-registration can never elevate (SEC-02)
```
The `UserRole` import at `app/api/auth/register/route.ts:6` stays (now used for the constant, not a cast). `role` must be dropped from the destructure so a crafted `role: "SUPER_ADMIN"` body key is ignored entirely (PITFALLS.md P5 — the `|| EMPLOYEE` fallback "looks safe" but any body that *includes* role wins).

**Validation pattern (keep as-is):** manual inline checks `if (!email || !password || !fullName) return errorResponse(..., 400)` (`register/route.ts:14-16`), 409 dup-checks (`:19-36`), try/catch → `console.error("Registration error:", error)` → `errorResponse("Internal server error", 500)` (`:80-83`). No zod on the server — this is the standing convention (CONVENTIONS.md line 68).

**Response pattern (keep as-is):** `successResponse({ id, email, fullName, nip, role, division }, "Registration successful", 201)` (`register/route.ts:68-79`) via `lib/api-response.ts` helpers — never inline `NextResponse.json`.

---

### `app/api/auth/logout-all/route.ts` (new — SEC-04)

**Analog:** `app/api/auth/logout/route.ts` (8 lines — the minimal handler template: no try/catch wrapper for cookie ops, `successResponse`) + `app/api/auth/me/route.ts:6-11` (auth guard + `unauthorizedResponse`).

**Core pattern:**
```typescript
// app/api/auth/logout-all/route.ts — copy the handler shape of app/api/auth/logout/route.ts
import { getCurrentUser, clearAuthCookie } from "@/lib/auth";
import db from "@/lib/db";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";

/**
 * POST /api/auth/logout-all - Revoke all sessions for the current user (SEC-04)
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  // Increment tokenVersion → all previously issued tokens fail the getCurrentUser check
  await db.user.update({
    where: { id: user.userId }, // NOTE: user.userId — never user.id
    data: { tokenVersion: { increment: 1 } },
  });

  await clearAuthCookie();
  return successResponse(null, "Logged out from all devices");
}
```
Auth-guard shape copied from `app/api/auth/me/route.ts:7-11` and `app/api/users/route.ts:12-15`. Requires `lib/auth.ts` `getCurrentUser` to gain the tokenVersion comparison (SEC-04 section above) — without it this route does nothing.

---

### `proxy.ts` (modify — SEC-05)

**Analog:** `proxy.ts` (self) — keep the `config.matcher` block (`proxy.ts:59-70`), the `verifyToken`-only approach (`proxy.ts:30`, no DB), the 401-JSON vs redirect branch (`proxy.ts:34-41`), and the `NextResponse.next()` pass-through. Only the route classification flips from allow-list to deny-list.

**SEC-05 — deny-by-default (replace `proxy.ts:7,16-18,24`):**
```typescript
// REPLACE the protectedRoutes allow-list (proxy.ts:7) with an explicit PUBLIC allow-list:
const publicRoutes = ["/login", "/register", "/api/auth/login", "/api/auth/register"];
const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));
```
```typescript
// REPLACE the auth-API special case (proxy.ts:16-18) and the isProtectedRoute check (proxy.ts:24):
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Deny-by-default: only explicit public routes pass without a token
  if (isPublicRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth-token");
  let user = null;
  if (token) {
    user = await verifyToken(token.value); // stateless — no DB (PITFALLS.md P4:98)
  }

  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Keep the authenticated-user header pass-through (proxy.ts:49-54) — x-user-id/x-user-role
  return NextResponse.next();
}
```
Keep the existing `config.matcher` static-asset exclusions (`proxy.ts:59-70`). Anything not in `publicRoutes` is now protected — covers `/dashboard`, `/assets*`, `/bast*`, `/maintenance*`, `/categories*`, `/locations*`, `/users*`, `/reports`, `/history`, `/api/*` beyond auth. The current bug where `/assets`, `/api/dashboard`, `/api/reports` are unprotected (PITFALLS.md P4:88) dies with the inversion. Keep the `verifyToken`-not-`getCurrentUser` split so the proxy stays DB-free (PITFALLS.md P4:98).

---

### `app/(authenticated)/layout.tsx` (modify — SEC-05)

**Analog:** `app/(authenticated)/history/page.tsx:7-8` and `app/bast/[id]/print/page.tsx:7-8` — the exact self-guard already in the codebase:
```typescript
const user = await getCurrentUser();
if (!user) redirect("/login");
```

**Core pattern (insert into `app/(authenticated)/layout.tsx` before the return, after line 7):**
```typescript
// app/(authenticated)/layout.tsx — line 7 currently: const user = await getCurrentUser();
// ADD (import redirect from "next/navigation" — same import as history/page.tsx:2):
import { redirect } from "next/navigation";
// ...
const user = await getCurrentUser();
if (!user) redirect("/login");
```
Copy the import line from `app/(authenticated)/history/page.tsx:2` (`import { redirect } from "next/navigation";`). `user` stays `JWTPayload | null` for `AppSidebar` (`layout.tsx:20` passes it straight through — keep the existing prop contract). Defense-in-depth note from PITFALLS.md P4:97: layouts don't re-run on client navigation — the proxy gate + per-handler `getCurrentUser()` remain the real enforcement; the layout redirect is the UX/backstop layer.

---

### `prisma/schema.prisma` (modify — SEC-04) + first migration

**Analog:** User model (`prisma/schema.prisma:38-53`) — self. Add the field next to `updatedAt` following the existing column conventions (`Int @default(...)` matches `role UserRole @default(EMPLOYEE)` at `:44`):
```prisma
model User {
  id            String     @id @default(cuid())
  email         String     @unique
  password      String
  fullName      String
  nip           String?    @unique
  role          UserRole   @default(EMPLOYEE)
  tokenVersion  Int        @default(0)   // ← NEW (SEC-04): increment on password change / logout-all
  divisionId    String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  // ...relations unchanged
}
```
**Migration:** no `prisma/migrations/` directory exists (glob returned empty — DB was likely created via `prisma db push`). The first migration is `npx prisma migrate dev --name add-token-version`; commit the generated `prisma/migrations/<timestamp>_add-token-version/migration.sql`. Schema changes are source of truth (PROJECT.md constraint line 59; AGENTS.md "Skema Prisma adalah source of truth; perubahan skema butuh migrasi").

**Import side effect:** after adding the field, `generateToken` call sites (`app/api/auth/login/route.ts:36-41`, `app/api/auth/register/route.ts:57-62`, `app/api/users/route.ts` does not generate tokens) must pass `tokenVersion: user.tokenVersion` in the payload — every JWTPayload now requires the field (compile-enforced by removing the index signature, which is the BUG-01 mechanism).

---

### `app/api/bast/[id]/approve/route.ts` + `app/api/assets/[id]/return/route.ts` (modify — BUG-01)

**Analog (correct usage to copy):** `app/api/auth/me/route.ts:15` (`where: { id: user.userId }`), `app/api/bast/route.ts:143` (`creatorId: user.userId`), `lib/actions/bast-actions.ts:68,163` (`creatorId: user.userId` / `approverId: user.userId`).

**BUG-01 — fix the two live bug sites:**
```typescript
// app/api/bast/[id]/approve/route.ts:31 (CURRENT)
approverId: user.id || null,        // user.id is undefined — index signature let it compile (BUG-01)
// FIX:
approverId: user.userId,            // matches correct usage at lib/actions/bast-actions.ts:163
```
```typescript
// app/api/assets/[id]/return/route.ts:47 (CURRENT)
creatorId: user.id as string,       // "as string" on undefined → stored undefined → 500 (BUG-01)
// FIX:
creatorId: user.userId,             // matches correct usage at app/api/bast/route.ts:143
```
The real fix is upstream: removing `[key: string]: unknown` from `JWTPayload` (`lib/auth.ts:17`) makes `user.id` a compile error at every future call site (PITFALLS.md P2:46). These two routes are the only remaining `user.id` usages (grep confirmed — 6 `user.id` matches, 4 are correct `user.id`-on-Prisma-row context in login/register responses, 2 are the bugs above). `user.fullName` at `approve/route.ts:32` stays. No other changes to these files — their try/catch + `$transaction` shape is untouched.

---

### `package.json` (modify — DATA-02, TEST-01)

**Analog:** `package.json` (self). Note the convention split: client pinned exact (`"@prisma/client": "6.19.0"` at `:17`), CLI caret-pinned (`"prisma": "^6.19.3"` at `:49`).

**DATA-02 — align versions (modify `package.json:17`):**
```json
"@prisma/client": "^6.19.3",
```
(pair with existing `"prisma": "^6.19.3"` at `:49` — match the CLI's caret style to keep both in lockstep).

**TEST-01 — add the test script (modify `package.json:5-10`):**
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
},
```
Also add devDeps: `vitest`, `vitest-mock-extended` (versions per research — none exist in the repo yet; `PITFALLS.md` P11:285 recommends `mockDeep<PrismaClient>` from `vitest-mock-extended`). The closest "standalone TS run by npm script" analogs are `prisma/seed.ts` (via `tsx`, `package.json:56-58`) and `scripts/reset-admin-password.ts` (uses `import "dotenv/config"` at `:2`).

---

## Shared Patterns

### Auth guard (401) — apply to every handler/action touched
**Source:** `app/api/auth/me/route.ts:7-11`, `app/api/users/route.ts:12-15`, `app/api/bast/[id]/approve/route.ts:8-9`
**Apply to:** `logout-all/route.ts` (new), `register/route.ts` (already public — do NOT add guard), all BUG-01 fixes
```typescript
const user = await getCurrentUser();
if (!user) {
  return unauthorizedResponse();
}
```

### Self-guard redirect — apply to `app/(authenticated)/layout.tsx`
**Source:** `app/(authenticated)/history/page.tsx:7-8` and `app/bast/[id]/print/page.tsx:7-8`
```typescript
const user = await getCurrentUser();
if (!user) redirect("/login");
```

### Response envelope — never build `NextResponse.json` inline
**Source:** `lib/api-response.ts` (`successResponse`, `errorResponse`, `unauthorizedResponse`, `forbiddenResponse`, `notFoundResponse`)
**Apply to:** all modified/new route files. Exception: `proxy.ts` already inlines the 401 JSON (`proxy.ts:36`) and keeps doing so — it cannot import the helpers without pulling `next/server` response wrappers into the middleware graph; preserve that one exception (CONVENTIONS.md line 143).

### Error handling — route handlers
**Source:** `app/api/auth/register/route.ts:80-83`, `app/api/users/route.ts:167-170`
**Apply to:** `register/route.ts` (unchanged), `logout-all/route.ts` (new)
```typescript
} catch (error) {
  console.error("X error:", error);
  return errorResponse("Internal server error", 500);
}
```
NOTE for BUG-01 fixes: `approve/route.ts:86-87` and `return/route.ts:65-67` currently leak `error.message` to clients — Phase 1 does NOT change these (SEC-09 is Phase 2), but the planner should not make it worse.

### Token payload contract — compile-time enforcement
**Source:** `app/api/auth/login/route.ts:36-41`, `app/api/auth/register/route.ts:57-62`
**Apply to:** both must add `tokenVersion: user.tokenVersion` to the `generateToken` payload once the field lands; the removed index signature makes omission a compile error (BUG-01 mechanism).

### Import/style conventions — all new/modified files
**Source:** CONVENTIONS.md + `lib/auth.ts`/`lib/api-response.ts` (hand-written style)
- `@/` alias for internal imports, never relative (except `scripts/*` which use `../lib/db` — do not follow that in `lib/`/`app/`)
- Double quotes, semicolons, trailing commas, 2-space indent (hand-written style)
- JSDoc `/** ... */` above every exported lib function and route handler
- Prisma enums/types imported directly from `@prisma/client`
- `crypto.randomUUID()` from `node:crypto` for jti

## No Analog Found

Files with no close match in the codebase (planner should use `.planning/research/PITFALLS.md` P11/P12 + PITFALLS.md "Integration Gotchas" rows 3–4, plus Context7 Vitest/Next 16 docs):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `vitest.config.ts` | config (test infra) | — | Zero test tooling exists — no vitest config, no test files, no `test` script (glob for `**/*.{test,spec}.*` empty). Follow PITFALLS P11:285 (`mockDeep<PrismaClient>`) and P12:310 (redirect mock throws `NEXT_REDIRECT`); `next/headers` cookies() must be mocked async (P11:286); `vi.mock("server-only", () => ({}))` (P12:313); `vi.clearAllMocks()` in `beforeEach` (P12:319) |
| `vitest.setup.ts` | config (test infra) | — | Same as above — setupFiles registered in vitest.config.ts (PITFALLS "Integration Gotchas" row 3) |
| `tests/auth.test.ts` | test | — | TEST-02: env-missing throws (SEC-01), wrong iss/aud/alg rejected (SEC-03), tokenVersion revocation (SEC-04). Pure `lib/auth.ts` unit tests — mock `next/headers` only, NOT Prisma (P11:284) |
| `tests/register.test.ts` | test | — | TEST-02: register with `role: "SUPER_ADMIN"` → stored EMPLOYEE. Use `mockDeep<PrismaClient>()` for the `db.user.create/findUnique` calls or invoke against a real test DB (P11:284-285); assert stored role, not mock call args (P12:301) |

## Metadata

**Analog search scope:** `lib/`, `app/api/**`, `app/(authenticated)/**`, `proxy.ts`, `prisma/`, `scripts/`, `.planning/research/` (PITFALLS.md)
**Files scanned:** 22 source files + 4 planning artifacts
**Pattern extraction date:** 2026-08-11

### Key evidence (grep-verified)
- `user.id` bug sites: `app/api/bast/[id]/approve/route.ts:31`, `app/api/assets/[id]/return/route.ts:47` — only two live occurrences
- Correct `user.userId`: `app/api/auth/me/route.ts:15`, `app/api/bast/route.ts:143`, `app/api/bast/[id]/route.ts:104`, `app/api/users/[id]/route.ts:21,73,152`, `lib/actions/bast-actions.ts:68,163`
- `process.env` module-load reads: `lib/db.ts:14,17` (NODE_ENV pattern for SEC-01), `lib/auth.ts:8` (the fallback to remove)
- No `prisma/migrations/` directory — SEC-04 creates the first migration
- No `app/register/` page — registration is API-only (`POST /api/auth/register`); the `/register` string in `proxy.ts:10` is dead allow-list entry
