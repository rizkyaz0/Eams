# Pitfalls Research

**Domain:** Enterprise Asset Management (EAMS) security hardening — Next.js 16 App Router + Prisma/PostgreSQL, JWT (jose) httpOnly-cookie auth, hybrid REST + server actions
**Researched:** 2026-08-10
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Hardcoded JWT secret fallback — forge any session when env is missing

**What goes wrong:**
`process.env.JWT_SECRET || "your-secret-key-change-this-in-production"` (`lib/auth.ts:8`). On any deploy where `.env` isn't propagated (`npm run build` without env, CI, container without env file), every token is signed with a publicly-known constant. Anyone who reads the repo can forge a `SUPER_ADMIN` token for any email. Combined with Pitfall 5 (open registration with arbitrary role), this is total compromise with zero credentials.

**Why it happens:**
Dev convenience. The fallback makes the app "just work" locally, so the missing-env case is never exercised until it's in production. Semgrep's JWT review of 2,000 npm modules found hardcoded secrets and missing token validation as the two most common JWT mistakes in the wild.

**How to avoid:**
- Fail fast at startup: `if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required")` in a module imported from the server entry (middleware/proxy, route handlers, actions, auth lib). Never fall back.
- Require a strong secret (≥256-bit random, `crypto.randomBytes(32).toString('hex')`), per-environment values, not shared with staging.
- Keep the secret out of source control; verify `JWT_SECRET` is absent from git history and `.env.example` uses a placeholder.
- Pin the algorithm on verify (jose: pass a `KeyObject`/secret and `algorithms: ['HS256']`; never let the token's `alg` header choose) — the `alg:none` downgrade was a historic JWT library failure mode.

**Warning signs:**
- Grep finds `|| "` near `JWT_SECRET` or any default literal secret.
- App boots without `JWT_SECRET` in env.
- `jwt.sign`/`jwtVerify` calls without explicit algorithm allowlist.
- CI builds succeed with empty env (no startup verification path).

**Phase to address:**
Phase 1 (Security hardening, SEC-01). Ship with a startup assertion test — the very first unit test should assert missing `JWT_SECRET` throws.

---

### Pitfall 2: JWT verification without issuer/audience — token reuse across contexts, blind claim trust

**What goes wrong:**
`jwtVerify` is called with only the secret; no `issuer`, no `audience`, no explicit `algorithms`. Payload claims (`role`, `userId`) are read and sometimes used before/without verification (the `user.id` vs `user.userId` bug is the symptom: `JWTPayload` has an `[key: string]: unknown` index signature so `.id` compiles yet is `undefined` at runtime). Missing `iss`/`aud` checks mean a token issued by any other service signing with the same key (stage app, another app sharing the secret) authenticates against this one; missing `sub` check means a forged/nonexistent user id can hit code paths.

**Why it happens:**
Single-service apps assume "the only tokens in the world are mine." jwt libraries verify signature by default but leave `iss`/`aud`/`alg` opt-in. Training-data tutorials for Express/JWT routinely omit them.

**How to avoid:**
- Sign with `new SignJWT(payload).setIssuer('eams').setAudience('eams-web').setIssuedAt().setExpirationTime(...)`; verify with the matching `issuer: 'eams'`, `audience: 'eams-web'`, `algorithms: ['HS256']`.
- Add `jti` (token id) to every token so a future denylist/revocation layer (Pitfall 3) has a handle.
- After verify, treat payload claims as untrusted input: validate `role` against the `UserRole` enum, resolve `sub`/`userId` against a real account before authorizing (fresh user lookup, not just `getCurrentUser` cache).
- Delete the index signature / add a typed `getUserIdentity(): { userId, email, role, fullName }` helper so `user.id` can't compile (the two live bugs in this codebase died exactly there).

**Warning signs:**
- No `issuer`/`audience` options at any `jwtVerify` call site.
- Payload fields accessed without an enum check or DB existence check.
- `as string` casts on possibly-undefined payload fields (the `user.id as string` that shipped the return-BAST 500).
- An untyped index signature on the payload type.

**Phase to address:**
Phase 1 (Security hardening: harden `lib/auth.ts` — SEC-01 covers secret + issuer/audience). Unit tests must assert wrong-issuer / wrong-audience tokens are rejected.

---

### Pitfall 3: No token revocation — 7-day JWT that survives logout, password change, and compromise

**What goes wrong:**
Single `auth-token` cookie with 7-day lifetime (`lib/auth.ts:41,68-74`), no session table, no denylist, no token version. Logout clears the cookie but the token remains valid for up to 7 days if stolen/replayed; a password reset or role demotion doesn't invalidate already-issued tokens; fired employees keep access until expiry.

**Why it happens:**
JWTs are stateless — revocation needs state, which is the "unfun" part tutorials skip. The logout-does-nothing mistake is invisible in normal use because the cookie is gone.

**How to avoid:**
- Don't build full session infra prematurely, but do the minimum for revocability:
  - Shorten the access-token lifetime (browser apps: 15 min–1 h) so the revocation window is small;
  - Add a `tokenVersion` integer to `User`, embed it in the token, and check it on verify — increment on password change, logout-all, role demotion. One DB read per verify, no denylist table.
  - Or (preferred later): an opaque server-side session table / refresh rotation — out of scope for this milestone, keep as a flagged follow-up.
- Never put the token in localStorage (XSS-readable) — the project already uses httpOnly cookie, which is correct; keep it.

**Warning signs:**
- Token `exp` measured in days/weeks for a browser session cookie.
- Logout handler only deletes the cookie.
- No code path that could reject a still-valid token (no version, no denylist, no session lookup anywhere).
- Password change doesn't bump any per-user invalidation state.

**Phase to address:**
Phase 1 (SEC-05/flag: minimal token-version revocation; full session table deferred). Verification: password change → old token now 401s.

---

### Pitfall 4: Authorization only inside `proxy.ts` (middleware) — bypassable by design

**What goes wrong:**
Treating the proxy as *the* security layer. In this codebase `proxy.ts:7` protects only `/dashboard` and excludes most `/api/*`; pages render the authenticated shell for anonymous users because layout never redirects. The deeper failure: Next.js 16's `proxy.ts` is a routing/interception layer, not a security boundary. CVE-2025-29927 (CVSS 9.1, patched 12.3.5/13.5.9/14.2.25/15.2.3) showed a crafted `x-middleware-subrequest` header skips middleware entirely — every app whose only auth lives in middleware was fully exposed. Matcher allow-lists also drift (a new route folder joined without editing the list is unprotected — already true here for `/assets`, `/bast`, `/api/dashboard`, `/api/reports`); prefix matching over-protects lookalikes; static exports don't run the proxy at all.

**Why it happens:**
Tutorials show proxy redirecting to `/login` and stop there, creating the mental model "auth is handled." Code review passes it because the UX (redirect) works.

**How to avoid:**
- Proxy = fast optimistic gate only (redirect unauthenticated browser traffic, security headers, optional route-level role redirect for UX).
- Every route handler and every server action independently calls `getCurrentUser()` + role check per operation (401/403) — never "the proxy handled it."
- Invert the matcher to deny-by-default: protect the whole `(authenticated)` group and `/api/*` except an explicit public allow-list (`/api/auth/login`, `/api/auth/register` if kept, `/login`).
- In the authenticated layout, `redirect('/login')` when `getCurrentUser()` returns null; do NOT rely on layout checks alone (layouts don't re-render on navigation — Clerk's guide flags this) — per-page/per-action checks are the real gate.
- Verifying the JWT twice (proxy + handler) is fine and intended: proxy uses `jwtVerify` only (no DB), handler does authz with fresh user data.

**Warning signs:**
- Any route handler/action that calls the DB without calling `getCurrentUser()` first.
- `proxy.ts` `protectedRoutes` is a hand-maintained prefix list with entries missing vs. the route tree.
- Layout check exists but no per-page redirect or handler checks.
- Tests don't include a "call the API directly with no cookie" case.

**Phase to address:**
Phase 1 (SEC-03 spans this; also the proxy allow-list + layout redirect). Integration tests should prove every endpoint 401s/403s when unauthenticated and when role-insufficient.

---

### Pitfall 5: Open registration trusting a client-supplied role (privilege escalation)

**What goes wrong:**
`POST /api/auth/register` is public (skipped in proxy `:16-18`) and takes `role` straight from the body: `role: (role as UserRole) || UserRole.EMPLOYEE` — an anonymous visitor registers as `SUPER_ADMIN` and owns the system. The `|| EMPLOYEE` fallback makes it look safe, but any request that *includes* `role: "SUPER_ADMIN"` wins.

**Why it happens:**
The form doesn't expose a role field, so the developer never tests the API directly with a crafted body. Client-side-only checks (nav hiding in `components/app-sidebar.tsx:25-91` is cosmetic) reinforce the illusion.

**How to avoid:**
- Never read role from request body on self-registration; hardcode `EMPLOYEE` server-side.
- If role assignment is needed, require an authenticated `SUPER_ADMIN`/`ADMIN_INSTANSI` actor to set it (separate admin-managed create-user endpoint) — or an invite flow. Do not broaden scope now: just ignore the body field.
- Apply the same rule to every create/update endpoint: fields not explicitly allowlisted must not reach Prisma `data` (see Pitfall 7).

**Warning signs:**
- Registration handler signature mentions `role` or casts body to `UserRole`.
- A test "register with `role: 'SUPER_ADMIN'` returns 403" does not exist.
- Login form advertises a default admin account (`admin@kantor.com / admin123` in the login form and reset scripts) — that's a separate MEDIUM issue (Pitfall on seeded credentials).

**Phase to address:**
Phase 1 (SEC-02). The first auth test in the suite: register with SUPER_ADMIN role → expect stored role EMPLOYEE (and 403 at admin endpoints).

---

### Pitfall 6: Role checks missing on mutations — any logged-in user approves BASTs, edits assets

**What goes wrong:**
Only `/api/users` routes enforce `hasMinimumRole`. Every other mutating endpoint authenticates only: an `EMPLOYEE` can create/dispose assets, approve and reject BASTs (including their own handover, then transfer custody to anyone named in `targetHolderId`), mass-set `status: "APPROVED"` (see Pitfall 7), create categories/locations/divisions, and complete maintenance records. Server actions mirror the gap (`approveBast`/`rejectBast` in `lib/actions/bast-actions.ts` have no role check).

**Why it happens:**
"Authenticated = authorized" conflation; role checks added reactively to the two endpoints that felt admin-ish while every other handler was copy-adapted from a template. UI nav hides the buttons, so manual testing never discovers the open APIs.

**How to avoid:**
- Build one `requireRole(user, minRole)` / `hasMinimumRole(user, role)` helper layered on `getCurrentUser()` and call it as the second line of every mutating handler and every mutating server action — including BAST approval/rejection, asset transfer/dispose, maintenance, master-data CRUD.
- Enforce minimum role at the *service layer* (the consolidated BAST service from BUG-02 must check roles itself, not rely on callers), so both REST and server-action entry points inherit it — pitfall of the duplicated-logic architecture (two entry points, one role check added → silent divergence).
- Add explicit deny rules: you cannot approve your own BAST (`creatorId === requesterId → 403`); only STAFF_ASSET/ADMIN can transfer custody.
- Consider an endpoint role matrix table in `.planning` (endpoint × minimum role) as the test contract.

**Warning signs:**
- `getCurrentUser()` present but no `hasMinimumRole`/`requireRole` in the same handler.
- Grep for `role` in `app/api/**` returns only 2 files.
- UI hides nav by role but the API returns 200 for the hidden action.
- A test could approve a BAST as EMPLOYEE and get 200.

**Phase to address:**
Phase 1 (SEC-03) — the single largest security fix; also prerequisites BUG-02 (service consolidation) so there is one place to enforce. Verification: role-matrix integration tests (employee vs staff vs admin on every mutation).

---

### Pitfall 7: Mass assignment — spreading the untrusted request body into Prisma `data`

**What goes wrong:**
`PATCH /api/bast/[id]` does `data: { ...body, approverId: user.userId, ... }` (`app/api/bast/[id]/route.ts:96-141`). Because the route has no role check (Pitfall 6) and no schema, any caller can set `status: "APPROVED"`, rewrite `bastNumber`, swap `creatorId`, or inject arbitrary fields Prisma will happily persist. The eager `...body` spread is the textbook mass-assignment/over-posting pattern that broke Rails in the 2010s.

**Why it happens:**
Spreading is the path of least resistance and compiles clean under TS (any-typed body); zod is installed but unused, so nothing forces an explicit field list. `catch (error: any) { return errorResponse(error.message) }` also turns validation-ish server errors into data-exfiltrating 500s (`:65-67`, `approve/route.ts:86-87`).

**How to avoid:**
- Never spread request bodies into Prisma `data`/`update`. Define a Zod schema per mutation (`z.object({ ... }).strict()` — `.strict()` rejects unknown keys) and build `data` by explicit allowlist: `data: { status: parsed.status, targetHolderId: parsed.targetHolderId ?? undefined, ... }`.
- Only the fields a role/action may change get parse schemas; everything else is dropped.
- Return generic errors (log server-side, respond `"Internal server error"`) — do not echo `error.message` (Prisma internals leak; LOW finding in CONCERNS.md).
- Validate pagination params with zod too (`z.coerce.number().int().min(1).max(100)`), which also kills the NaN/negative-`take` 500s across all list routes.

**Warning signs:**
- `...req` spread or `...body` spread near `data:`/`create`/`update`.
- No zod import in any route in `app/api/**` (current state: zero).
- `.strict()` nowhere in the codebase.
- `error.message` returned to clients in catch blocks.
- `parseInt(searchParams.get("page"))` unclamped.

**Phase to address:**
Phase 1 (SEC-03 + input-validation work; zod layer). Verification: send `{ status: "APPROVED", creatrId: "x" }` extra keys + wrong types → 400/422, fields unchanged.

---

### Pitfall 8: Racy document numbering — `count()+1` outside the transaction

**What goes wrong:**
BAST number = `existingCount + 1` computed via `count()` *outside* the transaction, then committed inside one (`app/api/bast/route.ts:121-130`, `lib/actions/bast-actions.ts:46-55`); RETURN numbers use `parseInt(lastBast.bastNumber.split("-")[2]) + 1` (`assets/[id]/return/route.ts:34`). Two concurrent creations read the same count → identical `bastNumber` → unique-constraint 500; the RETURN scheme breaks if the number lacks a third `-` segment. The codebase's scaling note is accurate: "effectively one BAST at a time per month."

**Why it happens:**
`count()`/`max()+1` looks correct in single-user testing (the classic race), the value is computed before the transaction because the developer thinks of "count" as a read, and nobody runs concurrent tests.

**How to avoid:**
- Decide the requirement: uniqueness vs gapless. For BAST numbering, **uniqueness is the requirement** (legal gapless is a myth; PostgreSQL sequences never roll back, gaps are normal and fine). Accept gaps.
- Simplest robust fix: allocate the number *inside* the transaction with `SELECT ... FOR UPDATE` on a counter row (Prisma: `tx.$queryRaw SELECT ... FROM Counter WHERE scope = $month FOR UPDATE`, then update + create), or use a per-month counter table + `WITH x AS (UPDATE counter SET n = n + 1 WHERE scope = $1 RETURNING n)` CTE.
- Alternative: DB sequence per scope + unique constraint — needs Prisma raw SQL for the per-month prefix; retry on P2034 (write conflict) with a bounded retry loop.
- Keep counter transactions short; a hot counter row serializes writers by design.
- Do NOT do `max()+1` in app code ever; do NOT split allocation from insert across requests.
- Add a unique constraint on `bastNumber` as backstop regardless.

**Warning signs:**
- `count()` or `max()` or `findFirst(orderBy desc)` used to compute a document number before a create.
- Hardcoded string-splitting of a number format (`split("-")[2]`).
- No concurrency test in the suite.
- `bastNumber` without a `@unique` in `schema.prisma` (it has one at `:88` — good backstop).

**Phase to address:**
Phase 2 (BUG-03, with the BAST service consolidation BUG-02). Verification: a test firing N concurrent BAST creations yields N distinct numbers, no 500s.

---

### Pitfall 9: `$transaction` misuse — interactive-transaction footguns, raw SQL injection

**What goes wrong:**
Class of Prisma transaction mistakes:
1. Non-interactive array `$transaction([...])` used where steps depend on intermediate values (needs interactive form).
2. Interactive `$transaction` without isolation/timeout tuning: default 5s timeout → lock waits throw P2028/P2034 under contention; using `FOR UPDATE` in a long transaction (HTTP request held open) causes deadlocks.
3. `$executeRawUnsafe` with string interpolation — the seed does exactly this (`prisma/seed.ts:10`) and hardcodes CUID ids; raw SQL is the injection vector Prisma exists to remove.
4. Splitting "read counter" and "write record" across separate transactions (see Pitfall 8).

**Why it happens:**
Interactive transactions are a newer API than the array form; tutorials show the array form for "wrap these queries"; developers measure "works in dev" and ship.

**How to avoid:**
- Use `$transaction(async (tx) => {...}, { maxWait, timeout })` whenever a later step depends on an earlier result; bump `timeout` deliberately (30–60s) when `FOR UPDATE` waits are possible.
- Retry P2034 (write conflict/deadlock) with a bounded retry loop; choose `isolationLevel: Serializable` only where truly needed (BAST approve + asset transfer is a good candidate — asset state must not be double-transferred).
- Parameterize all raw SQL: `$queryRaw` tagged templates / `Prisma.sql`; never interpolate strings into `$executeRaw*`. Replace the seed's raw SQL with `prisma.division.create`/`upsert` and `cuid()` ids.
- Keep interactive transactions short — no external network calls inside; no user-I/O waits.

**Warning signs:**
- `$queryRawUnsafe`/`$executeRawUnsafe` anywhere (grep the whole repo, node_modules excluded).
- Array-form `$transaction` where the second statement uses the first statement's value.
- No `maxWait`/`timeout` args on interactive transactions.
- No P2034 retry where Serializable is used.

**Phase to address:**
Phase 2 (BUG-03 + seed hardening in the same phase; seed is raw-SQL TRUNCATE + interpolated inserts per CONCERNS tech debt). Verification: concurrent BAST/approve test; `prisma db seed` runs against a scratch DB without wrecking production data (upsert semantics).

---

### Pitfall 10: File upload without validation, served from `public/` — stored XSS + disk DoS

**What goes wrong:**
`app/api/assets/[id]/images/route.ts:27-41` accepts any type/size, sanitizes only the filename, writes to `public/uploads/assets/`, and Next.js serves that directory statically on the same origin. Consequences:
- **SVG/HTML upload = stored XSS.** SVG is an XML document the browser parses like HTML; `<script>` inside executes in your origin when served inline. The project's CSP (if any) never governs a standalone-served file — the file is its own document.
- **No size cap = disk-fill DoS.** A 10 GB upload fills the volume.
- **MIME spoofing:** `file.type` is client-supplied ("image/png" is a lie); no magic-byte check.
- **Same-origin serving** means any script smuggled in has the session cookie.

**Why it happens:**
"Accept anything, sanitize the name" is the fast path; the image preview works in the browser, so it feels done. SVG being executable never occurs because "it's an image."

**How to avoid:**
- Validate content, not the header: read the first bytes and check magic numbers (file-type / `sharp` probe), allowlist `image/jpeg|png|webp` — **reject SVG** for asset images (or treat as untrusted documents: DOMPurify SVG profile + `Content-Disposition: attachment`).
- Cap size (e.g. 5 MB) at the handler *and* at the proxy (`proxyClientMaxBodySize` exists in Next 16 for the buffered proxy body).
- Regenerate the filename server-side (random id + validated extension); never use the client filename in a path (path traversal).
- Store **outside** `public/`: `uploads/` dir → serve via an authenticated route handler that sets validated `Content-Type`, `Content-Disposition: attachment` (or inline only for images after re-encode), `X-Content-Type-Options: nosniff`.
- Require role (asset staff/admin) on the upload endpoint — not just "logged in".
- Cleanup: delete replaced/disposed asset images (currently orphaned forever).
- For raster images, best-practice hardening is re-encode server-side (sharp) to strip EXIF and polyglot tails — optional this milestone, flag for later.

**Warning signs:**
- Upload handler writes under `public/` and `public/uploads/**` is served by Next.
- No file-type/magic-byte check; only `file.type` or extension used.
- No `MAX_UPLOAD_BYTES` constant anywhere.
- `file.name` used to build the save path or served URL.
- No `X-Content-Type-Options: nosniff`/`Content-Disposition` on the serving route.
- Upload endpoint checks only authentication, not role.

**Phase to address:**
Phase 1 (SEC-04). Verification: upload `.svg` with script → rejected or served as attachment; upload >5 MB → 413; anonymous/employee upload → 401/403; file not reachable at a static `/uploads/**` URL.

---

### Pitfall 11: Mocking Prisma wrong — tests assert calls, not behavior

**What goes wrong:**
Hand-rolled `vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(() => mockClient) }))` with a few stubbed methods (as in the widely-shared login test pattern). Tests then assert `findUnique` was called with specific args — verifying the implementation, not behavior. Consequences: `findFirst`→`findMany` refactor breaks test (wasted); more importantly, schema/constraint bugs (unique-violation behavior, enum rejection, null-on-required, `where` typos) are invisible — exactly the class of bug (`user.id` vs `userId`, invalid enum 500s) this codebase shipped without tests. A mock can't answer "does my Prisma *schema* accept this?" — only a real DB can.

**Why it happens:**
"Unit tests must not touch the DB" dogma applied unthinkingly to an ORM, where the ORM *is* the code under test's dependency — the mocking burden grows with every added query (update lastLoginAt → mock one more method), and the tests get more coupled and less truthful.

**How to avoid:**
- Follow the 2026 Next.js test pyramid: Vitest unit tests for pure functions, zod schemas, sync components, and **server-action/service logic invoked directly** (mock only request-scoped modules + your session helper, not the DB client); integration tests against a **real test database** (Docker/Postgres, `prisma migrate deploy` with `TEST_DATABASE_URL`, `deleteMany` cleanup in `beforeEach`) for route handlers, services, and data access; Playwright only for async Server Components and full workflows.
- If a unit test genuinely needs the client mock, use `mockDeep<PrismaClient>()` (the official Prisma DeepMockProxy pattern, jest-mock-extended/vitest-mock-extended) so all 200+ methods exist and future refactors don't add mock maintenance — but keep such tests few.
- Never mock `next/headers` `cookies()`/`headers()` with sync returns — they're async since Next 15; returning a stale synchronous store type-crashes or silently misbehaves.

**Warning signs:**
- Tests asserting `prisma.user.findUnique` `toHaveBeenCalledWith(...)`.
- A manual 5-method mock of PrismaClient.
- No integration test with a real DB anywhere; test script absent from `package.json` (current state).
- No cleanup strategy between tests.

**Phase to address:**
Phase 3 (TEST-01). Auth+RABC suite first (register-role, anonymous 401, employee 403, approverId recorded), then BAST workflow — these are the exact bugs zero tests let through.

---

### Pitfall 12: Testing implementation instead of behavior — and redirect() mocks that don't throw

**What goes wrong:**
Two compounding testing mistakes:
1. **Implementation-coupling:** asserting "component called fetch with these args" instead of "rendered output shows the data" — implementation details change, behavior contracts don't; tests then break on refactor and give false confidence.
2. **`redirect()` mock without throw:** `vi.mock('next/navigation', () => ({ redirect: vi.fn() }))`. In real Next.js, `redirect()` throws a control-flow signal (`NEXT_REDIRECT`). A mock that returns `undefined` lets code *after* the redirect keep executing — a "user redirected" test passes falsely while the handler actually continues and mutates data. This is the most common false-positive in App Router unit tests.

**Why it happens:**
Tutorials show `redirect: vi.fn()` and copy-paste propagates it; `await`-less mock returns silently satisfy the type checker. Asserting fetch calls is easier than rendering output.

**How to avoid:**
- Mock `redirect` to throw: `redirect: vi.fn((url) => { throw new Error('NEXT_REDIRECT: ' + url) })`, and assert with `await expect(action()).rejects.toThrow('NEXT_REDIRECT: /login')` + `expect(redirect).toHaveBeenCalledWith('/login')`.
- Assert behavior: for components, render and query `getByText/getByRole` for the data; for services/actions, assert on return values and DB state (integration).
- For every protected action, run the four-branch matrix: anonymous / invalid input / wrong owner / insufficient role (and one happy path). These are milliseconds each and catch the IDOR-shaped bugs.
- Mock `server-only` (`vi.mock('server-only', () => ({}))`) or importing server modules in Vitest throws.

**Warning signs:**
- Any mock of `next/navigation` whose `redirect` doesn't throw.
- Tests asserting fetch/HTTP arguments rather than rendered output or return values.
- One happy-path test per action, no authorization-branch tests.
- `vi.clearAllMocks()` missing in `beforeEach` (state contamination → order-dependent results).

**Phase to address:**
Phase 3 (TEST-01) — bake these rules into the Vitest `setupFiles` + a shared `authMatrix` test helper.

---

### Pitfall 13: E2E flakiness — mocking server actions, testing `next dev`, shared state

**What goes wrong:**
Playwright suites that stub server actions/network in-browser, run against `next dev`, share browser context between tests, or run tests non-isolated against production data. Symptoms: tests pass locally, flake in CI; "works in dev, fails on prod build"; a test leaves a mutated row that breaks the next test.

**Why it happens:**
E2E is where "make it green" shortcuts concentrate: stubbing the action looks like speed; dev server is available; DB seeding per test is perceived as slow.

**How to avoid:**
- Never mock server actions in E2E — the server is the boundary; drive the real UI, real action, real (test) DB, assert on what the user sees. Stubbing belongs in Vitest unit tests.
- Run Playwright against the **production build** (`next build && next start`), not the dev server.
- Fresh browser context per test (isolation); role-based selectors (`getByRole`, `getByLabel`) over CSS.
- Test DB isolation: run the destructive `TRUNCATE ... CASCADE` seed (rewritten upsert-style, Pitfall 9) against a *test* database only, never the dev/prod DB; or per-test transaction rollback.
- Reserve E2E for critical flows (auth, BAST create→approve→transfer, upload); keep unit/integration for edge cases.
- Add `retry` for network wobble but fix the underlying isolation; don't mask ordering bugs.

**Warning signs:**
- `page.route()`/request interception stubbing server actions in e2e.
- Playwright config pointing at `next dev` / localhost dev server.
- No per-test DB reset; a test suite that depends on execution order.
- Selectors like `[data-testid="row-3"]` or CSS classes.

**Phase to address:**
Phase 3 (TEST-01, then BAST workflow E2E). Verification: two consecutive CI runs of the full suite are green with zero order-dependence.

---

### Pitfall 14: Next.js 16 migration gotchas — `middleware.ts` → `proxy.ts` rename and docs drift

**What goes wrong:**
Next.js 16 renamed `middleware.ts` → `proxy.ts` and the export `middleware` → `proxy` (same matcher mechanics; also `proxyClientMaxBodySize` for the now-buffered body). Pitfalls:
- Old references survive: `BACKEND_README.md` references `middleware.ts` that no longer exists; tutorials/`eslint` configs (16.3 vs eslint-config-next 16.1.6) drift.
- `proxyClientMaxBodySize` default: Next clones/buffers the request body for proxy reads — uploading big files through the proxy path has a size ceiling and memory cost; route handlers must account for it (relevant to Pitfall 10).
- Rename confusion in searches: "middleware" documentation still surfaces; a dev adds `middleware.ts` to a Next 16 app and it silently... is treated as a page file / doesn't run.
- Server Actions are reachable by direct POST with a `Next-Action` header observed in the network tab — authorization inside the action is mandatory regardless of any proxy gate (Pitfall 4).

**Why it happens:**
Framework renames create a documentation half-life: half the web is still "middleware", older boilerplates, and muscle memory write the old file name.

**How to avoid:**
- Use `proxy.ts` + `export function proxy(...)` only; grep the repo for `middleware.ts` references (docs, configs, `BACKEND_README.md`) and update them.
- Align `eslint-config-next` with `next` (16.1.6 vs 16.3.0 pins).
- When auditing/regenerating docs (out of scope this milestone, but the roadmap should include a docs pass), verify against the codebase (file conventions changed).
- Remember server actions + route handlers are public endpoints: require `getCurrentUser()` + `requireRole` inside, always.

**Warning signs:**
- Any file named `middleware.ts` in a Next 16 project root (or references to it).
- `proxy.ts` absent while auth-expecting code exists.
- eslint-config-next major/minor mismatch with `next`.
- Docs or comments referencing `middleware` only.

**Phase to address:**
Cross-cutting: Phase 1 (proxy fixes) + a docs-update step in the final phase. Verification: fresh dev starts exercise only `proxy.ts`; grep for stale `middleware.ts` references returns none.

---

### Pitfall 15: BAST logic duplicated across REST and server actions — security fixes applied once, silently not twice

**What goes wrong:**
This codebase has two full implementations of BAST create/approve/reject (API routes + `lib/actions/bast-actions.ts`) that diverge: the API version hardcodes `conditionBefore: "GOOD"`, `targetHolderId: null`, `targetLocationId: null`; approve flows differ (`PATCH` vs `POST /approve` vs action with `MAINTENANCE_OUT` auto-ticket); `PATCH` ignores `MAINTENANCE_OUT`/`MAINTENANCE_IN`. Now add a security fix (role check, Pitfall 6): apply it to one path, the other stays open. "Fixes applied in one place silently miss the other" is the documented failure — and it compounds every hardening pitfall in this file.

**Why it happens:**
Two entry points grew organically (server actions for UI, REST for the QR printer/other clients); each was written from scratch; review checks one (the more-recent action version) and the API route lives untouched.

**How to avoid:**
- Extract one `lib/services/bast-service.ts` with typed status-transition rules per `BastType`, and make **both** API routes and server actions thin callers (parse → authn → authz → validate → call service → translate response).
- Put the role checks + numbering (Pitfall 8) + image handling in the service so there is exactly one enforcement point.
- Delete the redundant implementation; keep an integration test that exercises the same service through *both* entry points and asserts identical behavior (this is a testable invariant: approve via REST and via action on fresh BASTs → same asset state).
- The generic rule: any mutation reachable from >1 boundary gets a service (per 2026 server-actions-vs-route-handlers guidance — boundary choice is about the caller, not where business rules live).

**Warning signs:**
- `bast` logic appears in both `app/api/bast/**` and `lib/actions/bast-actions.ts` with different field handling.
- A CONCERNS.md note "behaviors differ" exists (it does).
- Role checks added in one place but the diff touches only one path.
- The QR/label path calls the API while the UI calls actions — two behaviors for the same operation.

**Phase to address:**
Phase 2 (BUG-02 consolidation, prerequisite to a correct SEC-03 in the service layer). Verification: matrix integration test asserts REST and action entry points produce identical outcomes.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded JWT secret fallback (`\|\| "secret-key"`) | App boots without env config | Anyone with repo can forge SUPER_ADMIN; compromise undiscovered until audit | **Never** |
| Spread `...body` into Prisma `data` | Fewer lines, no schema writing | Mass-assignment → privilege escalation, corrupted records | **Never** |
| `any` typing for Prisma where/payloads (~39 sites) | Compiles fast, no type work | Invalid enums/field names silently reach runtime (root of `user.id` bug class) | **Never** (TS strict is a project constraint) |
| Raw-SQL seed with `TRUNCATE ... CASCADE` + hardcoded ids | Quick, one file | Destructive against any DB; breaks on schema drift; injection-prone pattern | **Never** against non-scratch DB |
| Demo credentials printed in login form + in reset scripts | Easy demos, fast onboarding | Publicly-known admin password on real deploys | **Never** in production; gate behind env |
| Filename-regex "sanitization" of uploads | Feels like validation | Doesn't constrain content; MIME spoofing & XSS remain | **Never** |
| Two parallel BAST implementations | Each entry point "simpler" | Divergent behavior; security fix applied to one path only | Never after Phase 2 consolidation |
| E2E-only testing (no unit/integration) | Smallest setup effort | 500ms-per-test suite that can't isolate auth branches | **Never** — pyramid required |
| Manual TESTING_CHECKLIST.md | No tooling to install | Disconnected from reality; nothing fails CI | Acceptable only as stopgap until TEST-01 |
| Test `redirect()` mock without throw | One-line mock | False positives: code after redirect "passes" while mutating | **Never** |
| Manual monthly BAST counter via `count()+1` | Obvious code | Duplicate numbers under concurrency → 500s | **Never** after BUG-03 |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| jose JWT verify | Verifying signature only; trusting `alg`/claims; no issuer/audience | `jwtVerify(token, key, { algorithms: ['HS256'], issuer: 'eams', audience: 'eams-web' })`; pin everything |
| JWT revocation | Stateless = no logout/password-change invalidation | `tokenVersion` on User checked at verify, or session table later; short access TTL |
| `next/headers` cookies/headers in tests | Sync mocks; import-time crash; missing setupFiles | Async mock returning Promise in vitest.setup.ts; register setupFiles in config |
| `next/navigation` redirect in tests | `vi.fn()` no-op → false positives | Mock throws `NEXT_REDIRECT`; assert `rejects.toThrow` |
| Prisma client in tests | Hand-rolled 5-method mock, then `toHaveBeenCalledWith` | Real test DB for integration; `mockDeep<PrismaClient>()` only for isolated unit cases |
| PostgreSQL numbering | `nextval` assumed gapless; expect gaps = bug | Gaps are normal; use sequence+unique, or counter row + FOR UPDATE if truly gapless |
| Proxy/middleware with uploads | Ignore body buffering limit | `proxyClientMaxBodySize` set > upload cap; otherwise size-cap enforcement at handler |
| Uploads & `public/` | Serve from public dir → same-origin stored XSS | Private dir + authenticated route, `nosniff` + `Content-Disposition: attachment`, validated MIME |
| Server Actions as API | Treat as "internal, so no auth" | They're public POST endpoints (Next-Action header visible in network tab) — authz inside |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `count()+1` BAST numbering | Duplicate `bastNumber` 500s; single-BAST-at-a-time throughput | Number inside transaction w/ counter row FOR UPDATE or sequence | ~2 concurrent creations (already broken per CONCERNS) |
| `max(number)+1` derived numbering with string split | 500s when format changes; duplicates | No app-side max+1, ever | 2 concurrent creations |
| Hot counter row (FOR UPDATE per BAST) | Serialized writers; lock waits under load | Keep tx short; accept gaps with sequence for volume | ~hundreds/s (fine for this scale — do not over-engineer) |
| History page `take:100 + include fan-out` | Slow page; 200 rows fetched per visit | Cursor pagination + `select` projections; later AuditLog | ~10s of BASTs (already a CONCERNS perf item) |
| CSV export `limit=100000` into browser | Janky export; memory spikes | Stream server-side from cursor query | ~100k rows |
| Dashboard 10+ sequential queries | Multi-second dashboard | `Promise.all` + merge duplicate BAST queries | Any usage (already flagged) |
| Unbounded `findMany` on master data | Slow category/location pages | Add pagination at thousands of rows | ~thousands of rows |
| E2E on dev server | Flaky CI, timing-dependent | Prod build + fresh context per test | First CI run |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Hardcoded JWT secret fallback (`lib/auth.ts:8`) | **CRITICAL** — forge SUPER_ADMIN for any email | Fail-fast env assertion; no default; per-env secret |
| Public register accepting body `role` (`register/route.ts:11,48`) | **CRITICAL** — anonymous SUPER_ADMIN | Always EMPLOYEE server-side; admin-only assignment |
| Role checks on only 2 of ~15 endpoints | **HIGH** — EMPLOYEE approves own BAST, transfers custody, edits assets | `requireRole` helper at every mutation + service layer |
| `data: {...body}` mass assignment (`bast/[id]/route.ts:96-141`) | **HIGH** — set status APPROVED, rewrite bastNumber | Zod `.strict()` schemas; explicit field allowlists |
| Uploads to `public/uploads/assets/` any type/size | **HIGH** — stored XSS (SVG/HTML), disk-fill DoS, same-origin cookie theft | Magic bytes + allowlist + size cap + store outside public/ + role gate |
| No token revocation (7-day TTL) | **MEDIUM** — logout/compromise leaves live token | Short TTL + tokenVersion check; session table later |
| Demo credentials in UI/scripts/seed | **MEDIUM** — published admin password | Remove hint; env-driven scripts; strong seeded password |
| Page routes unprotected by proxy + layout no redirect | **MEDIUM** — anonymous sees page shells; API 401 only | Deny-by-default matcher; layout redirect; per-page checks |
| CSV formula injection (assets export) | **MEDIUM** — code exec in Excel/Sheets | Escape `= + - @` cells; quote CSV fields |
| `error.message` leaked to clients | **LOW** — Prisma internals exposed | Log real error; generic response |
| Debug `console.log` of full DB records (reject route) | **LOW** — sensitive data in logs | Remove; id-only logging |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Role-gated nav hides actions without API enforcement | Drive-by users get 403s they can't explain; admins "can't find" features | Keep nav hiding for UX but align with real API 403 semantics; surface permission errors in UI toasts |
| BAST approval silently records no approver (`approverId null`) | Auditors can't see who approved; trust broken | `approverId: user.userId` + UAT assert in TEST-01 |
| Return-BAST always 500s (`user.id`) | Feature dead; user retries & corrupts state | Fix identity helper; test the flow E2E |
| Auto-return ignores targetHolder/Location (API route) | Asset "transferred" to nobody — state lies | Honor validated fields or drop from contract; test behavior |
| Upload rejected with raw server error | Confusing message; no guidance on size/type | Validate early with clear zod messages (max 5MB, JPEG/PNG/WebP) |
| Jobs running admin scripts (`reset-admin-password`) against real DB | One command wipes/overwrites prod creds | Single CLI reading env + confirmation; test-DB-only seed |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **JWT auth:** `JWT_SECRET` has a fallback string — verify startup throws when env missing; verify `alg`/`iss`/`aud` pinned on verify.
- [ ] **JWT auth:** logout deletes cookie only — verify a stolen token is dead (tokenVersion/session), not just "cookie gone".
- [ ] **Registration:** form has no role field — verify API ignores a crafted `role: "SUPER_ADMIN"` body (test it!).
- [ ] **RBAC:** sidebar hides admin nav — verify each mutation endpoint 403s for EMPLOYEE via direct HTTP (proxy/who calls it: direct fetch, not UI).
- [ ] **BAST approve:** response succeeds — verify `approverId`/`approverName` actually persisted (was null — `user.id` bug).
- [ ] **BAST approve:** asset transferred — verify holder/location updated for ASSIGNMENT type (API route dropped fields).
- [ ] **BAST numbering:** works solo — verify two concurrent creations produce distinct numbers (bug live: same count → 500).
- [ ] **Uploads:** image preview works — verify `.svg` with `<script>` is rejected/served-as-attachment and megabyte cap enforced.
- [ ] **Uploads:** file saved — verify path is outside `public/` and GET requires auth (not a static `/uploads/**` URL).
- [ ] **Seed:** `prisma db seed` works — verify it can't `TRUNCATE` a non-scratch DB (rewrite with upsert; dev-only guard).
- [ ] **proxy.ts:** `/dashboard` redirects — verify `/assets`, `/bast`, `/api/dashboard` etc. also enforce (allow-list drifted).
- [ ] **Tests:** `npm test` passes — verify a `test` script exists at all (currently none in package.json) and CI runs it.
- [ ] **Redirect tests:** "redirects to /login" test green — verify the mock threw `NEXT_REDIRECT` (otherwise false positive).

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hardcoded-secret compromise (tokens forged) | **HIGH** | Rotate secret immediately (all old tokens die — single-secret HS256 means rotate = force re-login); reset all admin passwords; audit `super_admin` users; add fail-fast + audit-log for role mutations |
| Attacker registered as SUPER_ADMIN | **HIGH** | Audit users by `createdAt`/known emails; demote/delete rogue accounts; turn on registration lock (invite flow); rotate secret if root cause was secret leak |
| Mass-assigned status/data corruption on BAST/asset | **HIGH** | Point-in-time restore of affected rows (backups); reconcile holder/location from BAST details; add zod `.strict()` before any further writes |
| Duplicate bastNumber → data blocked | **MEDIUM** | Dedup pass (append suffix or renumber violating rows after unique fix); implement counter-row numbering; add concurrency test |
| Uploaded XSS file served from public/ | **MEDIUM** | Delete stored files; purge CDN/static cache; serve remaining uploads as attachments; move dir outside public/; scan for existing SVG/HTML uploads |
| Tests all green but auth bug slips (false-positive redirect) | **MEDIUM** | Review mocks in setup file (redirect must throw); add four-branch matrix; add one E2E auth flow on prod build |
| `error.message` internal details leaked to logs/errors service | **LOW** | Grep catch blocks returning `error.message`; swap to generic messages; keep structured server logs |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hardcoded JWT secret fallback (P1) | Phase 1 (SEC-01) | Unit test: missing env throws; forged token w/ fallback secret rejected |
| Missing issuer/audience/alg pinning (P2) | Phase 1 (SEC-01, auth lib hardening) | Tests: wrong-iss/aud tokens → verify throws |
| No token revocation (P3) | Phase 1 (tokenVersion; full sessions deferred) | Test: password change → old token 401 |
| Proxy-only auth (P4) | Phase 1 (proxy deny-by-default + layout redirect + per-endpoint checks) | Integration: every endpoint 401 no-cookie; /assets redirects anonymous |
| Open register with role (P5) | Phase 1 (SEC-02) | Test: register w/ SUPER_ADMIN → stored EMPLOYEE |
| Mutation role checks (P6) | Phase 1 (SEC-03) via Phase-2 service | Role matrix integration tests per endpoint |
| Mass assignment (P7) | Phase 1 (zod `.strict()` schemas + pagination) | Tests: extra keys rejected; NaN page → clamped/400 |
| Racy numbering (P8) | Phase 2 (BUG-03) | Concurrency test: N parallel creates → N distinct numbers |
| $transaction misuse / raw SQL (P9) | Phase 2 (BUG-03 + seed rewrite) | Concurrent approve test; seed runs on scratch DB via upsert |
| Upload validation / public/ (P10) | Phase 1 (SEC-04) | Upload tests: svg rejected/attachment, size cap 413, 401/403 |
| Prisma mocking wrong (P11) | Phase 3 (TEST-01 foundations) | Integration layer exists w/ real test DB; no `toHaveBeenCalledWith` Prisma asserts |
| Implementation vs behavior / redirect mock (P12) | Phase 3 (TEST-01; setupFiles rules) | Four-branch matrix on each protected action; redirect mock throws |
| E2E flakiness (P13) | Phase 3 (TEST-01 E2E for BAST workflow) | Two consecutive green CI runs, prod build, isolated contexts |
| Next.js 16 proxy rename/doc drift (P14) | Phase 1 (proxy) + docs pass in final phase | Grep `middleware.ts` → none; eslint-config-next aligned |
| Duplicated BAST logic (P15) | Phase 2 (BUG-02 consolidation) | Matrix test: REST vs action → identical outcomes |

## Sources

- Next.js 16 official docs (proxy.ts, authentication guide, route handlers, revalidatePath, `proxyClientMaxBodySize`): https://github.com/vercel/next.js/blob/v16.2.9/docs/01-app/02-guides/authentication.mdx ; .../backend-for-frontend.mdx ; .../04-functions/revalidatePath.mdx — MEDIUM (context7, curated)
- Prisma 6.19.x interactive transactions (Serializable isolation, FOR UPDATE atomic counter, P2034 retry) & DeepMockProxy testing pattern: https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/interactive-transactions/tests.ts ; .../issues/21136-extensions-mocking-library/tests.ts — MEDIUM (context7)
- CVE-2025-29927 middleware bypass analysis ("After CVE-2025-29927: the Next.js auth patterns that survived the patch", Faultline Security, 2026-04-28) — MEDIUM (exa)
- Next.js 16 3-layer auth model (proxy.ts as routing layer, Server Component authz, data-layer scoping) — shubhra.dev, 2026-06-08; Clerk Next.js Auth Guide 2026 (2026-07-20); Auth0 Next.js 16 + Server Actions (2026-07-31); WorkOS Next.js App Router auth guide 2026 (2026-02-17) — MEDIUM (exa, cross-checked)
- Server Actions vs Route Handlers boundary & shared service layer: frontendaccelerator.com/blog/server-actions-vs-route-handlers... (2026-07-24); paulund.co.uk/notebook/nextjs/route-handlers-vs-server-actions (2026-04-08); pean.dev (2026-05-06) — MEDIUM (exa, cross-checked)
- JWT mistakes (hardcoded secrets, unverified tokens, alg:none): semgrep.dev blog (JWT review of 2,000 npm modules); workos.com/blog/jwt-best-practices (2026-05-07); shattered.io/jwt-authentication-nodejs (2026-06-11); nodejs-security.com — MEDIUM (exa, cross-checked)
- PostgreSQL numbering (sequenced vs gapless, counter-table FOR UPDATE, CTE update-returning): cybertec-postgresql.com/en/postgresql-sequences-vs-invoice-numbers (2022-09-20); appmaster.io/blog/concurrency-safe-invoice-numbering (2025-10-08); postgresql.org/docs/current/sql-createsequence.html — MEDIUM (exa, cross-checked)
- Upload security (magic bytes, SVG = XSS document, Content-Disposition/noSniff, outside public/): securestartkit.com secure-image-uploads (2026-06-15); justappsec.com/guides/secure-file-uploads-in-nodejs (2026-03-04); nextjslaunchpad.com file uploads (2026-03-03) — MEDIUM (exa, cross-checked)
- Testing Next.js 16 (Vitest/Playwright boundary, request-scoped mocks, redirect-throw, four-branch matrix): codewithseb.com (2026-07-12); devcheolu.com (2026-05-18); nextjslaunchpad.com testing guide (2026-02-26); iamraghuveer.com (2026-04-11); nico.fyi/blog/stop-mocking-prisma-in-tests (2025-06-16) — MEDIUM (exa, cross-checked)
- Project-internal ground truth: `.planning/codebase/CONCERNS.md` audit (2026-08-10) — every live bug and security finding cross-referenced here (HIGH — direct code evidence)

---
*Pitfalls research for: EAMS security hardening (Next.js 16 + Prisma)*
*Researched: 2026-08-10*