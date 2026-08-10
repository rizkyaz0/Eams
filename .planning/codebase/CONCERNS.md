# Codebase Concerns

**Analysis Date:** 2026-08-10

**Project:** EAMS (Enterprise Asset Management System) — Next.js 16 App Router + Prisma/PostgreSQL
**Git state:** 5 commits (v1.0.0 → v1.0.3); package.json modified but uncommitted.

---

## Tech Debt

### Duplicate BAST creation & approval implementations
- Issue: Two parallel, divergent implementations of the same business logic. API routes at `app/api/bast/route.ts` + `app/api/bast/[id]/approve/route.ts` + `app/api/bast/[id]/reject/route.ts` sit alongside server actions in `lib/actions/bast-actions.ts` (`createBast`, `approveBast`, `rejectBast`). The behaviors differ: `app/api/bast/route.ts:150-163` hardcodes `conditionBefore: "GOOD"`, `targetHolderId: null`, `targetLocationId: null` for every detail, while the server action version honors client input (`lib/actions/bast-actions.ts:73-85`). The approve flows also differ — `PATCH /api/bast/[id]` transfers holder/location immutably, `POST /api/bast/[id]/approve` has a `MAINTENANCE_OUT` auto-ticket extension that the server-action version lacks, and `PATCH` ignores `MAINTENANCE_OUT`/`MAINTENANCE_IN` entirely.
- Files: `app/api/bast/route.ts`, `app/api/bast/[id]/route.ts`, `app/api/bast/[id]/approve/route.ts`, `app/api/bast/[id]/reject/route.ts`, `lib/actions/bast-actions.ts`
- Impact: Fixes applied in one place silently miss the other; behavior of BAST approval depends on which caller the UI uses; two sources of truth for status transitions.
- Fix approach: Consolidate into a single service layer (e.g., `lib/services/bast-service.ts`) with typed transition rules per `BastType`; make both API routes and server actions call it. Delete the redundant implementation.

### Pervasive `any` typing defeats strict mode
- Issue: tsconfig sets `"strict": true` (`tsconfig.json:7`) but ~39 sites use `any`: `where: any = {}` in every list route (`app/api/assets/route.ts:28`, `app/api/users/route.ts:33`, `app/api/bast/route.ts:28`, `app/api/maintenance/route.ts:26`), `updateData: any` (`app/api/bast/[id]/route.ts:112`, `app/api/bast/[id]/approve/route.ts:39`, `app/api/users/[id]/route.ts:87`), `item: any`, `error: any`, and `useState<any[]>` in every page (`app/(authenticated)/assets/page.tsx:15`, `app/(authenticated)/users/page.tsx:13`, `app/(authenticated)/bast/page.tsx:13`, `app/(authenticated)/dashboard/page.tsx:10`, etc.).
- Impact: Invalid enum strings, missing fields, and changed Prisma payloads pass silently to runtime; this is what allowed the `user.id` vs `user.userId` bugs (see Known Bugs).
- Fix approach: Replace `where` with typed `Prisma.*WhereInput`; replace payload/state types with generated Prisma types or Zod schemas; remove `error: any` in favor of `unknown` + narrowing.

### Destructive raw-SQL seed
- Issue: `prisma/seed.ts` uses `$executeRawUnsafe` with `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` (`prisma/seed.ts:10`) and string-interpolated inserts with hardcoded CUID ids (`prisma/seed.ts:13-59`). The interpolated hash at `prisma/seed.ts:20-24` makes the pattern SQL-injection-prone if ever generalized; the hardcoded ids break whenever the schema or id format changes.
- Impact: Running `prisma db seed` wipes all production data; the seed only recreates a tiny fixed dataset. A typo or schema drift breaks the seed silently.
- Fix approach: Use parameterized `$executeRaw` or, preferably, `prisma.division.create(...)` with `upsert` semantics; generate ids via `cuid()`.

### Dead code and leftover demo/template files
- Issue: (a) `AuditLog` model exists in `prisma/schema.prisma:137-149` but is referenced nowhere in the codebase (grep for `auditLog|AuditLog` finds zero usages) — the "audit trail" feature promised in `BACKEND_README.md` was never wired up. (b) `app/(authenticated)/dashboard/data.json` (13 KB of shadcn dashboard demo rows — "Cover page", "Executive summary", reviewers "Eddie Lake" etc.) is committed; it is not imported by any page. (c) `public/uploads/assets/cmm1ghxry0001siyg1t4wamxo-1771989024526-unnamed.png` — a user-uploaded asset image — is committed to git. (d) `<Settings>` nav item points to `/settings`, a route that does not exist (`components/app-sidebar.tsx:93-100` → 404).
- Files: `prisma/schema.prisma`, `app/(authenticated)/dashboard/data.json`, `public/uploads/assets/*.png`, `components/app-sidebar.tsx`
- Impact: Confusing maintainers, dead schema weight, repo bloat with runtime artifacts.
- Fix approach: Delete `data.json` and the committed upload; either implement `/settings` or remove the nav item; wire `AuditLog` into BAST approval / asset mutations or drop the model.

### Stale documentation
- Issue: `README.md` is the untouched `create-next-app` boilerplate (`README.md` says "This is a Next.js project bootstrapped with create-next-app"). `BACKEND_README.md` references files that no longer exist: `middleware.ts` (renamed to `proxy.ts`) and `prisma/prisma.config.ts` (never created), and its route tree omits `app/api/bast/[id]/approve`, `app/api/bast/[id]/reject`, `app/api/assets/[id]/images`, `app/api/assets/[id]/return`, `app/api/reports`, `app/api/maintenance/[id]`, `app/api/categories/[id]`, `app/api/locations/[id]`, `app/api/users/[id]`.
- Impact: Onboarding agents/humans follow wrong file names and missing endpoints.
- Fix approach: Regenerate docs from code (see `/gsd-docs-update`).

### Redundant dependencies
- Issue: Two icon libraries installed and both used: `@tabler/icons-react` and `lucide-react` (both in `package.json`). `next-themes` + `sonner` + hand-rolled `hooks/use-toast.ts`/`components/ui/toast.tsx` + `components/ui/sonner.tsx` overlap.
- Impact: Bundle size and dependency surface.
- Fix approach: Pick one icon library; drop unused toast stack if `sonner` is the active one.

---

## Known Bugs

### BAST auto-return (`POST /api/assets/[id]/return`) always fails with a 500
- Symptoms: Creating a return BAST throws and never completes.
- Trigger: Any asset in `IN_USE` status with `app/api/assets/[id]/return/route.ts:47` calling `prisma.bast.create` with `creatorId: user.id as string`.
- Cause: `getCurrentUser()` returns a `JWTPayload` whose field is `userId`, not `id` (`lib/auth.ts:12-18`). `user.id` is therefore `undefined`; the `as string` cast hides it at compile time. Prisma then rejects the required `creatorId` field, `catch (error: any)` returns `error.message` to the client (`app/api/assets/[id]/return/route.ts:67`).
- Files: `app/api/assets/[id]/return/route.ts`, `lib/auth.ts`
- Workaround: None — feature is broken.
- Fix approach: Use `user.userId` and remove the cast; add a shared `assertUser()` helper.

### BAST approval never records the approver
- Symptoms: Approved BASTs have `approverId`/`approverName` = null despite approval succeeding.
- Trigger: Any approval via `POST /api/bast/[id]/approve` (`app/api/bast/[id]/approve/route.ts:30-33`): `approverId: user.id || null` — again `user.id` is `undefined`, so it becomes `null` silently.
- Files: `app/api/bast/[id]/approve/route.ts`
- Fix approach: `approverId: user.userId`, `approverName: user.fullName` (the server-action version in `lib/actions/bast-actions.ts:163-164` uses `user.userId` correctly — copy it).

### BAST number generation is racy and inconsistent
- Symptoms: Under concurrent creation, two BASTs get the same number → unique-constraint 500 on `bastNumber` (`prisma/schema.prisma:88`); or gaps/duplicates in the monthly sequence.
- Cause: Number = `existingCount + 1` computed outside the transaction via `count()` then used inside a transaction (`app/api/bast/route.ts:121-130`; `lib/actions/bast-actions.ts:46-55`). The RETURN numbering uses yet another scheme: `parseInt(lastBast.bastNumber.split("-")[2]) + 1` (`app/api/assets/[id]/return/route.ts:34`), which breaks if a RETURN BAST number ever lacks a third `-` segment.
- Files: `app/api/bast/route.ts`, `lib/actions/bast-actions.ts`, `app/api/assets/[id]/return/route.ts`
- Fix approach: Generate the number inside the transaction with `SELECT ... FOR UPDATE` on a counter row, or use a DB sequence/`Serial`-style column.

### Debug `console.log` of database objects left in production code
- Symptoms: `app/api/bast/[id]/reject/route.ts:12-22` logs `Rejecting BAST ID:`, the full `bast` record (including creator/asset linkage), and status checks to server stdout on every request.
- Impact: Sensitive business data in logs; noisy output.
- Fix approach: Remove the debug statements; keep at most an `id`-only log or structured logger with levels.

### Pagination params are unvalidated (NaN / negative)
- Symptoms: `/api/assets?page=abc`, `page=-2`, or `limit=0` produce `skip = NaN` or negative `take`; Prisma throws, or `totalPages` becomes `Infinity`/garbage. Every list endpoint shares the pattern: `parseInt(searchParams.get("page") || "1")` at `app/api/assets/route.ts:19-20`, `app/api/users/route.ts:24-25`, `app/api/bast/route.ts:19-20`, `app/api/maintenance/route.ts:18-19`.
- Fix approach: Clamp with zod (`z.coerce.number().int().min(1).default(1)` / max limit).

### API-route BAST creation drops detail fields
- Symptoms: Creating a BAST through `POST /api/bast` ignores `targetHolderId`, `targetLocationId`, and per-item `conditionBefore` supplied by the client — they are hardcoded to `null`/`GOOD` (`app/api/bast/route.ts:150-163`). ASSIGNMENT approvals then never transfer holders/locations, silently producing the wrong asset state.
- Fix approach: Either honor the incoming fields or remove them from the create payload contract.

---

## Security Considerations

### CRITICAL: Hardcoded fallback JWT signing secret
- Risk: `lib/auth.ts:8` signs tokens with `process.env.JWT_SECRET || "your-secret-key-change-this-in-production"`. If the env var is missing (any deploy where `.env` isn't propagated), every token is signed with a publicly-known constant — anyone can forge a `SUPER_ADMIN` session for any email.
- Files: `lib/auth.ts:8`
- Current mitigation: None — the fallback is the default.
- Recommendation: Fail fast at startup if `JWT_SECRET` is unset (`throw new Error("JWT_SECRET is required")`); never fall back to a constant. Also rotate to a per-environment secret and add `setIssuer()`/`setAudience()`.

### CRITICAL: Unauthenticated self-registration with arbitrary role
- Risk: `POST /api/auth/register` is open (explicitly skipped by middleware at `proxy.ts:16-18`) and takes `role` straight from the request body: `role: (role as UserRole) || UserRole.EMPLOYEE` (`app/api/auth/register/route.ts:11,48`). Any anonymous visitor can register as `SUPER_ADMIN` and own the system.
- Files: `app/api/auth/register/route.ts`
- Current mitigation: None.
- Recommendation: Remove the endpoint, or gate it behind an admin-created invite/verification flow and ignore any client-supplied role (always `EMPLOYEE`). Must be fixed together with the JWT secret issue — together they allow full compromise.

### HIGH: Role-based authorization missing on most mutations
- Risk: Only `app/api/users/route.ts` and `app/api/users/[id]/route.ts` enforce roles (`hasMinimumRole`). Every other mutating endpoint checks authentication only — any logged-in user (including `EMPLOYEE`) can:
  - Create assets (`app/api/assets/route.ts:86-91`), update and dispose them (`app/api/assets/[id]/route.ts:80-85`, `141-146`)
  - Create (get) — approve and reject BASTs (`app/api/bast/[id]/approve/route.ts:7-9`, `app/api/bast/[id]/reject/route.ts:6-8`), including approving their own BAST and thus transferring asset custody to anyone they name in `targetHolderId`
  - Do a mass-assignment `PATCH /api/bast/[id]` that spreads the entire body: `data: { ...body, approverId: user.userId, ... }` (`app/api/bast/[id]/route.ts:96-141`) — a user can set `status: "APPROVED"`, rewrite `bastNumber`, change `creatorId`, or inject arbitrary fields
  - Create/complete maintenance records and change asset statuses (`app/api/maintenance/route.ts:77`, `app/api/maintenance/[id]/route.ts:29-79`)
  - Create categories/locations/divisions (`app/api/categories/route.ts:38`, `app/api/locations/route.ts`, `app/api/divisions/route.ts:38`)
  - Server actions mirror the same gap: `approveBast`/`rejectBast` in `lib/actions/bast-actions.ts:101-209` have no role check.
- Files: `app/api/assets/route.ts`, `app/api/assets/[id]/route.ts`, `app/api/bast/[id]/route.ts`, `app/api/bast/[id]/approve/route.ts`, `app/api/bast/[id]/reject/route.ts`, `app/api/maintenance/route.ts`, `app/api/maintenance/[id]/route.ts`, `app/api/categories/route.ts`, `app/api/locations/route.ts`, `app/api/divisions/route.ts`, `lib/actions/bast-actions.ts`
- Current mitigation: UI hides nav items by role (`components/app-sidebar.tsx:25-91`), which is cosmetic only — APIs are directly reachable.
- Recommendation: Add a per-endpoint role matrix (e.g., a `requireRole(user, [...roles])` helper layered on `lib/auth.ts:102-104`) for all mutations and for BAST approval/asset transfer; never spread untrusted bodies into Prisma `data`.

### HIGH: Unrestricted file upload served from `public/`
- Risk: `app/api/assets/[id]/images/route.ts:27-41` accepts any file type and any size, sanitizing only the filename, and writes to `public/uploads/assets/` — which Next.js serves statically. An authenticated user can upload `SVG`/`HTML` (stored XSS on the same origin), a giant file (disk-fill DoS), or a polyglot file; there is no MIME sniffing, magic-byte check, size cap, or permission check beyond "logged in".
- Files: `app/api/assets/[id]/images/route.ts`
- Current mitigation: Filename regex strip (`[^a-zA-Z0-9.-]`) — does not constrain content.
- Recommendation: Validate `file.type` against an image allowlist, check magic bytes, cap size (e.g., 5 MB), store outside `public/` (e.g., `uploads/` + serve via an authenticated route or object storage), and enforce role requirements (asset-staff/admin only).

### MEDIUM: CSV formula injection on export
- Risk: `app/(authenticated)/assets/page.tsx:87-111` builds a CSV by raw `rows.join(",")` with no escaping. `name`/`serialNumber`/`specification` are user-controlled; a value starting with `=`, `+`, `-`, or `@` executes as a formula when the exported `.csv` is opened in Excel/Sheets (client-side code execution).
- Files: `app/(authenticated)/assets/page.tsx`
- Recommendation: Escape cells starting with formula characters and wrap fields containing commas/quotes/newlines in quotes with doubled `"`.

### MEDIUM: Login has no brute-force protection
- Risk: `app/api/auth/login/route.ts` does an unbounded bcrypt-comparison on every attempt with no rate limit, lockout, or delay; `auth-token` has a 7-day lifetime with no revocation/session listing (`lib/auth.ts:41,68-74`).
- Files: `app/api/auth/login/route.ts`, `lib/auth.ts`
- Recommendation: Rate-limit per IP/email (e.g., `@upstash/ratelimit` or in-DB counter); consider issuing short-lived access + refresh tokens and a session table so a compromised token is revocable.

### MEDIUM: Known default credentials shipped and advertised
- Risk: The login form prints demo credentials to every visitor: `admin@kantor.com / admin123` (`components/login-form.tsx:87`). Repo scripts hardcode passwords: `scripts/reset-admin-password.mjs:15-16` and `scripts/reset-admin-password.ts:7-8` (`admin123`), `scripts/fix-login.ts:7` (`password123`), and the seed installs users with a published bcrypt hash of `password123` (`prisma/seed.ts:19-24`). If these scripts or the seed run against a deployed database, the admin password is publicly known.
- Files: `components/login-form.tsx`, `scripts/reset-admin-password.mjs`, `scripts/reset-admin-password.ts`, `scripts/fix-login.ts`, `prisma/seed.ts`
- Recommendation: Remove the demo-credentials hint from the login form; make scripts read the target email/password from env; enforce a strong initial password for seeded admins.

### MEDIUM: Page routes are not actually protected
- Risk: `proxy.ts:7` protects only `/dashboard` among page routes — `/assets`, `/bast`, `/categories`, `/locations`, `/maintenance`, `/reports`, `/users`, `/history` are absent. The authenticated layout `app/(authenticated)/layout.tsx:6-27` renders for everyone: it calls `getCurrentUser()` but never redirects on `null` and passes `user` (possibly `null`) into the sidebar. Unauthenticated visitors therefore receive full page shells; only the client-side fetches 401. `app/(authenticated)/history/page.tsx:8` is the only page doing a server-side redirect.
- Files: `proxy.ts`, `app/(authenticated)/layout.tsx`
- Recommendation: Add ALL authenticated page prefixes to `proxy.ts` protectedRoutes (or match the whole `(authenticated)` group) and add a `redirect("/login")` when `getCurrentUser()` returns null in the layout.

### LOW: Internal error details leaked to clients
- Risk: `catch (error: any) { return errorResponse(error.message || ...) }` in `app/api/assets/[id]/return/route.ts:65-67`, `app/api/bast/[id]/approve/route.ts:86-87`, `app/api/bast/[id]/reject/route.ts:35-36` exposes Prisma/driver internals to callers.
- Recommendation: Log the real error server-side; return a generic message.

---

## Performance Bottlenecks

### History page loads 200 records on every render
- Problem: `app/(authenticated)/history/page.tsx:11-31` runs `bast.findMany({ take: 100, include: { creator, details: { include: { asset } } } })` plus `maintenance.findMany({ take: 100, include: { asset } })` on every visit, then the client re-filters/paginates in memory (`app/(authenticated)/history/history-client.tsx:33-43`).
- Files: `app/(authenticated)/history/page.tsx`, `app/(authenticated)/history/history-client.tsx`
- Cause: No cursor/pagination at the query level; eager include fan-out (BAST→details→asset).
- Improvement path: Paginate server-side with `skip`/`take` + cursor, use `select` projections instead of `include`, and consider a materialized activity view (or finally use the unused `AuditLog` table).

### CSV export pulls up to 100k rows into the browser
- Problem: `app/(authenticated)/assets/page.tsx:89` fetches `/api/assets?limit=100000`, which builds an unbounded `findMany` with full `include` (`app/api/assets/route.ts:43-64`) and then serializes it client-side.
- Improvement path: Stream a CSV server-side from a cursor-based query; drop `include` to the exported columns only.

### Dashboard aggregates run many sequential queries
- Problem: `app/api/dashboard/route.ts` issues 10+ sequential queries (`groupBy` status/role, category counts, BAST list, maintenance alerts, aggregates, recent activities) per request; two of them (`:69-84`, `:141-152`) duplicate BAST queries, and activities are sorted/sliced in JS.
- Improvement path: Parallelize with `Promise.all`, merge the BAST queries, and push sorting/limiting into SQL.

### Heavy QR-scanner library loaded eagerly
- Problem: `html5-qrcode` (large, ~1 MB, no TS types — imported with `@ts-ignore` at `components/qr-scanner-dialog.tsx:4-5`) is statically imported and bundled even though the scanner only runs when the dialog opens; `scannerRef` also uses `any`.
- Improvement path: `next/dynamic` with `ssr: false` for the scanner module; wrap in a typed façade.

---

## Fragile Areas

### `user.id` vs `user.userId` confusion (JWT payload typing)
- Files: `lib/auth.ts:12-18`, `app/api/assets/[id]/return/route.ts:47`, `app/api/bast/[id]/approve/route.ts:31`, `app/api/bast/route.ts:143`, `app/api/bast/[id]/route.ts:104`
- Why fragile: `JWTPayload` has `userId` plus an `[key: string]: unknown` index signature (`lib/auth.ts:17`), so `payload.id` compiles as `unknown` and any `.id` access silently yields `undefined` at runtime. Two live bugs already result (see Known Bugs). Any future use of `user.id` repeats them.
- Safe modification: Always use `user.userId`; consider removing the index signature and adding `getUserIdentity()` helper returning `{ userId, email, role, fullName }`.
- Test coverage: None.

### Middleware allow-list drift
- Files: `proxy.ts:7`
- Why fragile: Route protection depends on a hand-maintained string prefix list. New page/API folders added without editing this list are unprotected (already the case for `/assets`, `/bast`, `/reports`, `/api/dashboard`, `/api/reports`, `/api/auth/me`). Prefix matching also over-protects lookalike paths (`/api/assets-old` matches `/api/assets`).
- Safe modification: Invert to deny-by-default (protect everything under `(authenticated)` and `/api/*` except explicit public allow-list); move API authz into route code so middleware is defense-in-depth, not the gate.

### Raw SQL seed and password-reset scripts
- Files: `prisma/seed.ts`, `scripts/reset-admin-password.mjs`, `scripts/reset-admin-password.ts`, `scripts/fix-login.ts`
- Why fragile: Three separate scripts mutate the admin password with slightly different emails (`admin@eams.com` vs `admin@kantor.com`) and passwords; the seed truncates the DB. Running any of them against a deployed DB has destructive or credential-overwrite consequences.
- Safe modification: Replace with a single CLI that prompts for or reads env-provided values and uses Prisma properly.

### Divergent approval semantics
- Files: `app/api/bast/[id]/route.ts` (PATCH), `app/api/bast/[id]/approve/route.ts`, `lib/actions/bast-actions.ts:101-179`
- Why fragile: Three ways to reach "approved", each with different asset-update rules and none role-gated. A change to one (e.g., adding `MAINTENANCE_IN` handling) makes behaviors inconsistent in production.

---

## Scaling Limits

- **BAST numbering:** `count()+1` and `max-number+1` schemes are single-node assumptions; concurrent traffic yields unique-constraint collisions (`app/api/bast/route.ts:121-130`, `app/api/assets/[id]/return/route.ts:34`). Current capacity is effectively "one BAST at a time per month".
- **File storage:** Uploads go to the local `public/uploads/` directory (`app/api/assets/[id]/images/route.ts:32-38`). Breaks on horizontally-scaled/severless deploys (ephemeral FS, non-shared storage); a Vercel redeploy orphans images referenced by `imagePath`.
- **Orphaned uploads:** There is no cleanup when an asset image is replaced, when the asset is disposed, or on BAST deletion — `public/uploads/assets/` accumulates unreferenced files.
- **List endpoints:** `categories`, `locations`, `divisions` GETs return unbounded full tables (`app/api/categories/route.ts:17-27`, etc.) — fine at dozens of rows, becomes slow at thousands.

---

## Dependencies at Risk

- **`next` vs `eslint-config-next`:** `package.json` pins `next ^16.3.0` (deps) but `eslint-config-next 16.1.6` (devDeps). Minor mismatch; lint rules may lag the framework. Align versions.
- **`html5-qrcode` 2.3.8:** No TypeScript types (import requires `@ts-ignore`), archived/lightly-maintained; earlier versions carried a known malformed-input/XSS CVE (fixed in 2.3.8 — verify the pinned version is actually installed by the lockfile). Camera-API surface is browser-specific.
- **Duplicate icon libs:** `@tabler/icons-react` and `lucide-react` both installed (`package.json:18,26`).
- **`zod` v4 + `react-hook-form` + `@hookform/resolvers`:** Present but largely unused — `app/api/auth/login/route.ts:9-15` and every other route validate manually; forms use uncontrolled HTML `required` attributes (e.g., `components/create-asset-dialog.tsx`). The planned-validation layer doesn't exist yet.
- **Untracked `.lcm/` and modified `package.json`/`package-lock.json`:** Working tree is dirty (git status shows `M package-lock.json`, `M package.json`, `?? .lcm/`), so the built app may not match the last commit (v1.0.3).

---

## Missing Critical Features

- **Real audit trail:** `AuditLog` model (`prisma/schema.prisma:137-149`) is unused; nothing records who created/approved/disposed what. History is a hand-rolled projection of the last 100 BAST/maintenance rows (`app/(authenticated)/history/page.tsx`).
- **Role enforcement at the data layer:** Only two endpoints check roles; the whole BAST approval/asset transfer domain runs on authentication-only checks (see Security).
- **Input validation:** No Zod schemas anywhere in API routes; invalid enum values (e.g., `status=FOO`) surface as 500s rather than 422s.
- **Image lifecycle:** No delete endpoint, no replacement cleanup, no storage abstraction.
- **Maintenance lifecycle:** No `COMPLETED`→asset available flow exists consistently in `app/api/maintenance/route.ts` (POST only handles `IN_PROGRESS`), and there is no maintenance scheduling/notification of upcoming due dates.
- **User self-service:** No profile/settings page (`/settings` 404s), no password change UI (only `PATCH /api/users/[id]` which requires self-or-admin), no password reset flow.
- **QR label regeneration:** `components/asset-label.tsx` renders labels, but there is no endpoint to regenerate/print QR data based on current asset state (only the scanner exists).
- **Blocks:** Everything above blocks a production rollout of BAST approval workflows, since an `EMPLOYEE` can currently approve their own handover documents.

---

## Test Coverage Gaps

- **Zero automated tests:** No test files (`.test.*`/`.spec.*`) exist anywhere in the project (only inside `node_modules`); no `jest.config.*`/`vitest.config.*`/`playwright.config.*`; `package.json` has no `test` script (`package.json:5-10`).
- **What's not tested:** Authentication/authorization matrix (the highest-risk area — every gap in this document went unnoticed because nothing asserts role behavior), BAST state transitions, BAST number generation, upload validation, CSV export escaping, pagination edge cases, and the seeded data integrity.
- **Files:** entire `app/api/*`, `lib/actions/*`, `lib/auth.ts`, `proxy.ts` are untested; client pages are untested.
- **Risk:** High — the register-role and `user.id` bugs are shipping bugs that a single auth/E2E test would have caught.
- **Priority:** High — start with an auth+RABC suite (register as `EMPLOYEE` → try admin actions → expect 403; verify anonymous upload rejected; verify BAST approval records `approverId`), then a BAST workflow test, then export/upload tests.
- **Docs note:** `TESTING_CHECKLIST.md` exists and describes manual checks — it is not automated evidence.

---

*Concerns audit: 2026-08-10*