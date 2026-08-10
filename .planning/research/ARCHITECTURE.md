# Architecture Research

**Domain:** Next.js 16 App Router + Prisma/PostgreSQL Enterprise Asset Management — security hardening of an existing hybrid (REST + server actions) application
**Researched:** 2026-08-10
**Confidence:** MEDIUM (core patterns verified against official Next.js + Prisma docs; ecosystem/test tooling specifics from multiple 2026 practitioner sources)

## Standard Architecture

### System Overview

The current EAMS hybrid (REST-API-first + BAST server actions + proxy.ts auth gate) is structurally sound but has one fatal flaw: **business logic lives in the transport layer**. The target architecture keeps the same three entry points (pages, REST handlers, server actions) but extracts all business rules into a server-only service layer, makes every entry point enforce authz itself (defense in depth — proxy is optimistic only), and moves state transitions + numbering behind transactions.

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│                     Presentation (App Router pages)                            │
│  Pages: app/(authenticated)/<feature>/page.tsx (client-heavy, fetch REST)      │
│  BAST dialog/detail pages call server actions only                            │
│  async Server Components (history, print) query services directly              │
└───────────────┬────────────────────────────────┬───────────────────────────────┘
                │ fetch() to REST                 │ import server actions
                ▼                                 ▼
┌────────────────────────────┐   ┌────────────────────────────────────────────┐
│   API Layer (REST, thin)   │   │       Server Actions (thin)                │
│  app/api/**/route.ts       │   │  lib/actions/bast-actions.ts               │
│  parse request → authz →   │   │  parse input → authz →                     │
│  delegate to service       │   │  delegate to service → revalidatePath      │
└───────────────┬────────────┘   └────────────────┬───────────────────────────┘
                │                                 │
                ▼                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                    Service Layer (server-only, single source of truth)         │
│  lib/services/bast-service.ts · asset-service.ts · auth-service.ts            │
│  lib/security.ts (requireUser/requireRole guard)                              │
│  lib/validation/*.ts (zod schemas)                                            │
│  All business rules + $transaction + atomic numbering live HERE               │
├───────────────────────────────────────────────────────────────────────────────┤
│                    Data Access (Prisma singleton lib/db.ts)                   │
│                    File Store: <root>/uploads/assets/ (private, NOT public/)  │
├───────────────────────────────────────────────────────────────────────────────┤
│     PostgreSQL: Asset, Bast, BastDetail, Maintenance, User, Division,         │
│     Location, Category + BastSequence counter rows (new)                      │
└───────────────────────────────────────────────────────────────────────────────┘
    proxy.ts (Next.js 16): optimistic auth check ONLY — 401 for /api, redirect
    for pages. Never the authorization gate. Matcher excludes server functions.
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Auth proxy (`proxy.ts`) | **Optimistic** auth pre-filter: verify JWT cookie exists/valid, 401 JSON on `/api/*` or redirect to `/login` on pages. No DB reads, no role decisions | Next.js 16 `proxy.ts` with `config.matcher`; deny-by-default: protect all `/api/*` + all `(authenticated)` pages, allow-list login/register/static |
| Auth domain (`lib/auth.ts`) | JWT sign/verify (jose), bcrypt (12 rounds), cookie helpers, role hierarchy, `requireUser()` / `requireRole(min)` guards that throw typed errors 401/403 | Existing `lib/auth.ts` hardened: remove hardcoded secret fallback, remove `[key: string]: unknown` index signature so `user.id ≠ user.userId` bugs die at compile time |
| Service layer (`lib/services/*`) | **All** business rules: BAST state transitions per `BastType`, numbered document generation, asset transfer/custody, maintenance lifecycle. Owns `$transaction` — including numbering. Pure server functions, transport-agnostic | `lib/services/bast-service.ts` (create/approve/reject/return), `lib/services/asset-service.ts`, `lib/services/auth-service.ts` (login/register with fixed EMPLOYEE role) |
| Security guard (`lib/security.ts`) | Single authz choke point called at the top of every entry point AND every sensitive service method: `requireUser()` + `requireRole(min)` based on the role matrix in `app-sidebar.tsx` | Thin wrapper over `lib/auth.ts` that returns typed `{ userId, email, role, fullName }` or throws `AuthError` (401) / `ForbiddenError` (403) |
| Validation schemas (`lib/validation/*`) | Server-side zod schemas per resource bound to Prisma-generated types; `where` clauses typed `Prisma.*WhereInput` | `bast-schema.ts`, `asset-schema.ts`, `pagination-schema.ts` (clamp `page`/`limit` with `z.coerce.number()`) |
| REST route handlers (thin) | Parse `Request` → call guard (401/403) → validate with zod (422) → delegate to service → map result to `ApiResponse` envelope | `app/api/bast/route.ts`, `app/api/bast/[id]/route.ts`, `app/api/assets/*`, etc. — each handler shrinks to ~30-50 lines |
| BAST server actions (thin) | Same delegation for UI-triggered mutations; adds `revalidatePath` after service success | `lib/actions/bast-actions.ts` — calls `bast-service`, never owns transitions |
| Upload route handler | Authenticated (role-gated) multipart intake: magic-byte sniff + allowlist + size cap → write to `<root>/uploads/assets/` (private) → DB stores relative path | `app/api/assets/[id]/images/route.ts` rewritten; storage behind `lib/storage.ts` abstraction |
| File serve route handler | Authz-gated file delivery: resolve path, reject traversal, stream with correct Content-Type / Content-Disposition, 304/ETag | `app/uploads/[...path]/route.ts` (or `app/api/files/[...path]/route.ts`) |
| Counter rows (new model) | Per (`year`, `month`, `type`) row holding last issued BAST sequence; `SELECT ... FOR UPDATE` inside the BAST creation transaction | `BastSequence` model in `prisma/schema.prisma`; incremented by `$queryRaw` inside `$transaction` |
| Prisma singleton | Single client (unchanged) | `lib/db.ts` globalThis-cached |

## Recommended Project Structure

```
lib/
├── auth.ts                 # JWT + bcrypt + cookie helpers (hardened)
├── security.ts             # requireUser() / requireRole() guards (authz choke point)
├── db.ts                   # Prisma singleton (unchanged)
├── api-response.ts         # { success, data?, error?, message? } envelope (unchanged)
├── storage.ts              # upload/serve abstraction: sniff, size-cap, write outside public/
├── numbering.ts            # nextBastNumber(tx, year, month, type) — counter row + FOR UPDATE
├── services/               # ★ single source of truth for business rules
│   ├── auth-service.ts     #   login, register (always EMPLOYEE), logout, me
│   ├── bast-service.ts     #   create/approve/reject/return BAST ($transaction owner)
│   ├── asset-service.ts    #   asset CRUD, status transitions, custody transfer
│   └── maintenance-service.ts
├── actions/                # "use server" thin wrappers over services
│   └── bast-actions.ts     #   parse → guard → service → revalidatePath
└── validation/
    ├── bast-schema.ts      # zod schemas shared by REST + actions
    ├── asset-schema.ts
    └── common.ts           # pagination clamp, id coercion
app/api/**/route.ts         # thin handlers: parse → guard → validate → service → envelope
app/uploads/[...path]/route.ts  # authz-gated file serving (outside public/)
prisma/schema.prisma        # + BastSequence model for atomic numbering
tests/                      # Vitest unit + integration (see Patterns)
e2e/                        # Playwright critical flows
```

### Structure Rationale

- **`lib/services/` is where business logic goes — never route handlers or actions.** The current bug (two divergent BAST implementations) exists precisely because transitions were embedded in transport files. Service functions are plain async server functions: importable from route handlers, server actions, and server components alike, and unit-testable without any request context.
- **`lib/security.ts` separate from `lib/auth.ts`:** auth = *who you are* (JWT/cookies), security = *what you may do*. Keeping the guard as one function (`requireRole(min)`) that every entry point and sensitive service calls prevents role drift — the current state where only 2 of 23 handlers check roles.
- **`lib/numbering.ts` separate from `bast-service.ts`:** numbering has one job (atomic, gap-free document numbers) and its own concurrency concern; isolating it makes it independently testable with a concurrency test (12 parallel creates → 12 unique numbers).
- **`app/uploads/[...path]` outside `app/api/`:** makes the "serve private file" boundary explicit and shares the proxy matcher semantics; the storage abstraction (`lib/storage.ts`) keeps the S3-migration path open when the project deploys to cloud (see PROJECT.md — object storage explicitly deferred).
- **Tests colocated in `tests/` + `e2e/` rather than inside `app/`:** route-handler tests need `next-test-api-route-handler` which must be the *first import* of a test file — keeping tests out of the handler tree avoids caching/matcher surprises.

## Architectural Patterns

### Pattern 1: Service-Layer Consolidation (single source of truth)

**What:** Extract every business rule into a plain server-only service function with a typed signature; route handlers and server actions become thin adapters that parse, guard, delegate, and translate. This is the pattern the community converged on for "server actions vs route handlers" (pean.dev 2026-05, frontendaccelerator 2026-07, Paulund 2026-04): "Server Actions and Route Handlers are entry points. They should not become the only place your business logic exists."

**When to use:** Whenever the same operation is reachable from more than one boundary — exactly the EAMS situation (REST `/api/bast/*` + `lib/actions/bast-actions.ts` both mutate BAST).

**Trade-offs:** One more layer of indirection; small scripts inside existing actions may not justify extraction. For BAST it absolutely does (3 divergent implementations already shipped).

**Example:**
```typescript
// lib/services/bast-service.ts (server-only, no "use server" — plain function)
export async function approveBast(tx: Prisma.TransactionClient | PrismaClient,
                                  bastId: string, actor: AuthedUser) {
  await tx.$queryRaw`SELECT id FROM "BastSequence" WHERE ... FOR UPDATE` // lock
  // ... full transition rules per BastType, asset status/holder updates ...
}

// app/api/bast/[id]/approve/route.ts (thin adapter)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = requireRole(await getCurrentUser(), UserRole.STAFF_ASSET) // 401/403
  const { id } = await params
  const result = await approveBast(db, id, user)   // ← the ONLY transition implementation
  revalidatePath(`/bast/${id}`); revalidatePath('/assets')
  return successResponse({ bast: result })
}

// lib/actions/bast-actions.ts (thin adapter, same service)
export async function approveBastAction(id: string) {
  const user = requireRole(await getCurrentUser(), UserRole.STAFF_ASSET)
  const result = await approveBast(db, id, user)
  revalidatePath(`/bast/${id}`); revalidatePath('/assets')
  return { success: true, bast: result }
}
```

**Decisions driven by this pattern:**
- Keep ONE transition implementation (`bast-service.ts`); delete `app/api/bast/[id]/approve/route.ts`, `[id]/reject/route.ts`, and the divergent branches, or keep them only as thin delegates (recommendation: keep REST delegates for API-surface compatibility since clients already fetch REST; all mutation *rules* live in the service).
- The `PATCH /api/bast/[id]` spread-anybody-body route must be removed or reduced to a strict whitelist — mass assignment (`data: { ...body, approverId: ... }`) is a privilege-escalation hole regardless of service layer.

### Pattern 2: Defense-in-Depth Authz (proxy = optimistic, handlers/actions = authoritative)

**What:** Three enforcement points, each with a different job: (1) `proxy.ts` — optimistic pre-filter only (cookie present/valid, redirect/401 for unauthenticated); (2) every route handler + server action — `requireRole()` at entry (authoritative, per-operation); (3) service layer — re-checks on sensitive operations (ownership/IDOR, e.g., can't approve your own BAST). This mirrors Vercel's own authentication guide ("Proxy should not be your only line of defense... checks should be performed as close as possible to your data source") and the direct-response to CVE-2025-29927 — middleware-only auth was bypassable via header spoofing (CVSS 9.1).

**When to use:** All Next.js 16 apps where `/api/*` exists. Next.js 16 renamed `middleware.ts` → `proxy.ts`, and its docs state server functions are POSTs to their parent route — if a proxy matcher excludes a path, server-action calls on that path skip proxy entirely, so actions MUST self-authorize.

**Trade-offs:** Slightly more code per entry point; compensated by the central `requireRole()` helper. Proxy matcher must be deny-by-default (all `/api/*` + pages) to avoid the current allow-list drift bug.

**Example:**
```typescript
// lib/security.ts — the single authz choke point
export function requireRole(user: AuthedUser | null, min: Role): AuthedUser {
  if (!user) throw new AuthError()                       // → 401
  if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[min]) throw new ForbiddenError() // → 403
  return user
}

// proxy.ts (optimistic ONLY — no DB, no role logic)
export const config = { matcher: ['/api/:path*', '/(authenticated)/:path*', '!/api/auth/login', '!/api/auth/register'] }
export function proxy(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value
  if (!token) return req.nextUrl.pathname.startsWith('/api/')
    ? Response.json({ success: false, message: 'authentication failed' }, { status: 401 })
    : NextResponse.redirect(new URL('/login', req.nextUrl))
  // NOTE: optional token *signature* verify here is fine (fast, no DB);
  // do NOT read roles from the cookie for authorization decisions.
}
```

### Pattern 3: Atomic BAST Numbering (counter row + SELECT FOR UPDATE)

**What:** Replace `count()+1` and `max+1` numbering with a per-(year, month, type) counter row locked pessimistically inside the same transaction that creates the BAST. PostgreSQL sequences cannot be used for *gapless* document numbers (nextval never rolls back → holes on aborted transactions; values can even jump backwards after crash recovery), so the counter-table/lock approach is the standard for business documents (Cybertec: "in many jurisdictions, invoice numbers must not have gaps"). BAST numbers are legal business documents — gapless sequential numbering per month is the expectation.

**When to use:** Any sequential document number that must not repeat AND looks wrong with gaps. EAMS BAST numbers (`BAST/YYYY/MM/NNN` style) qualify.

**Trade-offs:** Serializes concurrent BAST creation for the same month/type (transactions wait on the counter row lock). At EAMS scale (dozens-hundreds of BAST/month) this is irrelevant; keep the locked transaction short. Do NOT lock a table with ordinary reads — counter row confines contention to one row.

**Example:**
```typescript
// lib/numbering.ts
export async function nextBastNumber(tx: Prisma.TransactionClient, year: number, month: number, type: BastType) {
  // 1. Pessimistically lock the counter row (Prisma has no FOR UPDATE — raw SQL required)
  await tx.$queryRaw`SELECT id FROM "BastSequence" WHERE year = ${year} AND month = ${month} AND type = ${type}::"BastType" FOR UPDATE`
  // 2. Increment and read back atomically
  const updated = await tx.$queryRaw<{ seq: number }[]>`
    UPDATE "BastSequence" SET seq = seq + 1
    WHERE year = ${year} AND month = ${month} AND type = ${type}::"BastType"
    RETURNING seq`
  return pad(updated[0].seq) // → "BAST/${year}/${month}/${seq.padStart(3,'0')}"
}

// lib/services/bast-service.ts — numbering inside the create transaction
export async function createBast(actor: AuthedUser, input: CreateBastInput) {
  return db.$transaction(async (tx) => {
    const bastNumber = await nextBastNumber(tx, ...)   // inside tx = atomic w/ insert
    return tx.bast.create({ data: { ...input, bastNumber, creatorId: actor.userId } })
  }, { timeout: 10_000, maxWait: 5_000 })
}
```

### Pattern 4: Layered Test Architecture (unit + integration + E2E)

**What:** Three test tiers with a hard boundary: **Unit (Vitest)** for server actions as plain async functions, services, validation schemas, auth guards — mocking Prisma with `vitest-mock-extended` (deep mock, because `prisma.bast.create` is a nested property) and mocking `next/headers`, `next/navigation` (redirect **must throw** to avoid false positives), `next/cache` (`revalidatePath`), and `server-only`. **Integration** for route handlers using `next-test-api-route-handler` (NTARH — must be the *first import*; emulates real cookie/headers/params context) and data-access tests against a real test database ("unit tests verify you call Prisma a certain way; integration tests verify the SQL is right for your schema" — iamraghuveer 2026-04). **E2E (Playwright)** for async Server Components (Vitest cannot render them — hard line) and critical user flows (login, BAST create→approve→asset transfer) against a real server + test DB; never mock server actions in E2E.

**When to use:** This is the standard for Next.js 16 (Vercel-aligned guides 2026 all converge on Vitest + Playwright + NTARH). **Context for EAMS:** zero tests exist today, so phase order must be: Vitest infra first, then auth/RBAC matrix (register-as-EMPLOYEE → admin call → 403; anonymous upload → 401; approve records `approverId`), then BAST workflow incl. numbering concurrency, then E2E.

**Trade-offs:** Three tools to configure; ~1-2 days setup. The alternative (mock everything in one layer) is the trap — mocked-DB tests can't catch schema drift (live here: `user.id` vs `user.userId` bugs went out with zero tests).

**Example:**
```typescript
// vitest.setup.ts — global mocks (applies to every test file)
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn((u: string) => { throw new Error(`NEXT_REDIRECT: ${u}`) }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
vi.mock('server-only', () => ({}))

// tests/bast-service.test.ts — unit, deep-mocked Prisma
import { mockDeep } from 'vitest-mock-extended'
vi.mock('@/lib/db', () => ({ db: mockDeep<PrismaClient>() }))
it('assigns unique numbers under concurrency', async () => {
  const results = await Promise.all([...Array(12)].map(() => createBast(actor, input)))
  expect(new Set(results.map(r => r.bastNumber)).size).toBe(12)
})

// app/api/bast/route.test.ts — integration, NTARH must be FIRST import
import { testApiHandler } from 'next-test-api-route-handler'
import * as appHandler from './route'
it('rejects TEKNISI creating BAST with 403', async () => {
  await testApiHandler({ appHandler, test: async ({ fetch }) => {
    const res = await fetch({ method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } })
    expect(res.status).toBe(403) } })
})
```

### Pattern 5: Uploads Outside `public/` + Authenticated Serve Route

**What:** Stop writing runtime files into `public/` (a build-time artifact directory — redeploys orphan/lose files; Vercel: "the public directory isn't a real directory... it isn't supposed to be used for persisted file storage"). Store uploads in a private dir (`<root>/uploads/assets/`), record only a relative path/key in the DB, and serve them through an authz-gated route handler that does: path-traversal guard (`path.resolve` + prefix check, reject `..`), correct `Content-Type`/`Content-Disposition`, ETag/304. Magic-byte validation at intake (allowlist png/jpeg/webp ≤ 5MB per SEC-04; rely on sniffed content-type, never client `file.type`). Object storage (S3/R2 + presigned URL sign→upload→finalize) is the cloud-deploy upgrade path — deliberately out of scope per PROJECT.md, but keep `lib/storage.ts` as the seam.

**When to use:** Any self-hosted/Node-runtime Next.js app (EAMS: no hosting target yet, so local private dir + volume is correct). Serverless FS is read-only, so ONLY local first — object storage matters only once Vercel/Lambda deploy is real.

**Trade-offs:** Local dir requires persistent volume at deploy (PROJECT.md already flags this); route-served files bypass CDN caching (fine at EAMS scale; add `Cache-Control` later or swap to S3). Never serve user content from the app origin's static path — that's the stored-XSS risk SEC-04 targets.

**Example:**
```typescript
// app/uploads/[...path]/route.ts — private, authz-gated file serving
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const user = requireUser(await getCurrentUser())                    // 401
  if (!assetImageVisibleTo(user, (await params).path)) return forbidden // 403 (admin/staff only)
  const filePath = path.resolve(process.cwd(), 'uploads/assets', ...(await params).path)
  if (!filePath.startsWith(path.resolve(process.cwd(), 'uploads/'))) return new NextResponse('bad request', { status: 400 }) // traversal guard
  if (!fs.existsSync(filePath)) return new NextResponse(null, { status: 404 })
  return new NextResponse(fs.createReadStream(filePath), { headers: { 'Content-Type': mime.getType(filePath) ?? 'application/octet-stream' } })
}
```

## Data Flow

### Request Flow — REST Mutations (BAST approve, hardened)

```
[Client page/dialog] → POST /api/bast/[id]/approve (fetch)
    ↓
[proxy.ts] optimistic JWT check → 401 if no/expired cookie (no role decisions)
    ↓
[route.ts] requireRole(getCurrentUser(), STAFF_ASSET) → 401 / 403
    ↓
[route.ts] zod.validate(params.id)
    ↓
[bast-service.approveBast(tx, id, actor)]
      ├─ FOR UPDATE lock on counter row (if renumbering) / row lock on bast
      ├─ load bast + details + asset
      ├─ enforce transition rules per BastType (single implementation!)
      ├─ update asset status/holder/location inside $transaction
      └─ set APPROVED + approverId = actor.userId   ← fixes the approver bug
    ↓
[route.ts] revalidatePath('/bast', ...) → successResponse(result)
    ↓
[Client] toasts + refetches
```

### Request Flow — Server Action (BAST create, hardened)

```
[Client dialog] → createBastAction(formData)  ("use server")
    ↓
[action] requireRole(getCurrentUser(), STAFF_ASSET)  ← actions self-authorize (proxy doesn't cover them)
    ↓
[action] zod safeParse input
    ↓
[bast-service.createBast(actor, input)]
      ├─ nextBastNumber(tx) — counter row FOR UPDATE inside $transaction ← fixes racy numbering
      └─ create bast + details
    ↓
[action] revalidatePath('/bast') → return { success, bast }
    ↓
[Client] useActionState shows result
```

### Key Data Flows

1. **BAST approval (single path now):** both REST and action call `bast-service.approveBast`; the service owns status/asset transitions, `approverId: actor.userId`, and `revalidatePath` is the only transport difference.
2. **Upload:** multipart → role-gated route handler → sniffed/allowlisted/size-capped → `lib/storage.save()` writes `<root>/uploads/assets/<uuid>.<ext>` → DB stores relative path → `<img src="/uploads/assets/...">` served by the guarded route → (future) same seam points at S3.
3. **Authz enforcement order:** proxy (optimistic, cheap) → handler/action `requireRole` (authoritative per-op) → service-level ownership checks (IDOR defense, e.g. cannot approve own BAST / mutate another division's assets).

### State Management

- **No global client store** (unchanged — each page owns `useState` + mount fetch; dialogs refetch via `onSuccess`). Server cache invalidation moves from "actions only" to "action + REST delegate both call `revalidatePath` after service success" (fixes stale-UI divergence).
- **Auth:** unchanged httpOnly `auth-token`; `getCurrentUser()` return type hardened (no index signature → `userId` guaranteed).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users / single node (EAMS today) | Monolith + Postgres is correct. Atomic numbering via counter rows fine. Tune `proxy.ts` matcher, never DB-check in proxy. |
| 1k-100k users / multi-replica | Counter-row FOR UPDATE serializes numbering — move to Postgres SEQUENCE per type (gaps acceptable) or S3 streaming for uploads; add connection pooling (PgBouncer); move dashboard/report SQL into indexed views. |
| 100k+ users | Split BAST/asset services; document service behind its own DB; object storage mandatory (local FS is per-replica). |

### Scaling Priorities

1. **First bottleneck (concurrency, ~already hit):** racy BAST numbering → fixed by Pattern 3; the counter row is the correct answer until monthly BAST volume makes the lock a contention point (not at this scale).
2. **Second bottleneck:** uploads on local FS with no shared volume — breaks the moment a second replica or serverless deploy appears; the `lib/storage.ts` seam makes S3/R2 the drop-in fix (PROJECT.md already defers this deliberately).

## Anti-Patterns

### Anti-Pattern 1: Business logic embedded in transport files

**What people do:** Write the full BAST transition in `route.ts` AND again in `actions.ts` (current EAMS state — 3 divergent implementations: REST approve auto-creates Maintenance on `MAINTENANCE_OUT`, server action doesn't; REST create hardcodes `conditionBefore: "GOOD"`).
**Why it's wrong:** Behavior drifts silently; fixes applied twice; callers see different results depending on which UI path they used; `revalidatePath` only exists in one path → stale UI.
**Do this instead:** One `lib/services/bast-service.ts`; handlers/actions are thin adapters that may differ only in transport concerns (HTTP status vs `revalidatePath`).

### Anti-Pattern 2: Middleware/proxy as the authorization gate

**What people do:** Bolster `proxy.ts` believing it secures routes (the allow-list drift bug already ships `/assets`, `/bast`, `/reports` unprotected; CVE-2025-29927 showed the whole class is bypassable).
**Why it's wrong:** Proxy runs at the routing layer, not the data layer; anything that bypasses routing (CVE, matcher gap, prefetch path, server-action POSTs to excluded paths) bypasses the proxy. Proxy cannot read the DB so it can't do ownership/role decisions anyway.
**Do this instead:** Proxy = optimistic cookie check only (redirect/401). Every handler/action calls `requireRole()`; services re-check ownership.

### Anti-Pattern 3: `count()+1` / `max+1` document numbering

**What people do:** `const n = await db.bast.count() + 1` then insert (current code), or `parseInt(last.bastNumber.split("-")[2]) + 1` (return route).
**Why it's wrong:** Two concurrent reads return the same value → unique-constraint 500; the count and the insert are not atomic; monthly reset is implicit and fragile; three call sites already use three different schemes.
**Do this instead:** Counter row + `SELECT ... FOR UPDATE` inside the create transaction (Pattern 3). Never compute a document number outside the transaction that assigns it.

### Anti-Pattern 4: Trusting client-provided fields wholesale

**What people do:** `data: { ...body, approverId: user.userId }` spread (current `PATCH /api/bast/[id]` — lets any user set `status: "APPROVED"` or rewrite `bastNumber`), and accepting `role` from the register body (CRITICAL).
**Why it's wrong:** Mass-assignment = privilege escalation; register-role = full compromise.
**Do this instead:** zod schemas with `.pick()`/`.strict()` per resource; service functions take explicit typed input; register always assigns `EMPLOYEE` (or invite flow per SEC-02).

### Anti-Pattern 5: Testing everything with mocks (or nothing at all)

**What people do:** Either zero tests (current) or a single Vitest layer where everything including the DB is mocked.
**Why it's wrong:** Mocked-DB tests verify "you called Prisma this way" — they cannot catch schema drift, missing constraints, or the `user.id`/`user.userId` silent-undefined bug that caused two live 500s.
**Do this instead:** The three-tier split (Pattern 4): deep-mocked unit tests for logic branches; real-test-DB integration for handlers/transactions/numbering; a thin Playwright E2E for auth + BAST flow.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| PostgreSQL | Prisma ORM; `$transaction` + `$queryRaw` FOR UPDATE for numbering | Passthrough `DATABASE_URL` pooled + `DIRECT_URL` (already configured); counter rows need a schema migration |
| Filesystem (uploads) | `lib/storage.ts` write/serve seam, private dir outside `public/` | Persistent volume required at deploy; S3/R2 presigned-URL pattern is the documented upgrade path |
| (future) Object storage | Presigned URL sign→upload→finalize w/ HEAD verification | Out of scope per PROJECT.md; the seam exists so no rewrite needed later |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client ↔ REST | HTTP `fetch` + JSON envelope | Unchanged surface, but each handler now guards + validates + delegates |
| Client ↔ Server Actions | `"use server"` import (POST under the hood) | Actions self-guard; proxy does NOT cover them reliably |
| REST/actions ↔ services | Direct async fn import (server-only) | The single source of truth; never `fetch()` your own API from a handler |
| Services ↔ Prisma | `tx` passed in (transactional) or `db` singleton | Numbering + transitions share one `$transaction` |
| Pages (`<img>`) ↔ private file route | Authenticated GET to `/uploads/...` | Only role-gated route serves uploads; never `public/` |
| Services ↔ `revalidatePath` | `next/cache` in adapters only | Keep cache invalidation out of services (they're transport-agnostic) |

## Build Order Implications (for roadmap)

Dependency-ordered sequence — each step unblocks the next and earlier steps make later ones safe:

1. **Foundation: typing + guards.** Harden `lib/auth.ts` (kill secret fallback, remove index signature so `user.id` typed-bug dies), add `lib/security.ts` (`requireUser`/`requireRole`), zod schemas. *Everything* depends on these — do first. → crosses SEC-01/SEC-02/BUG-01, enables TEST-01 for the auth matrix.
2. **Service extraction (BUG-02).** Extract `lib/services/bast-service.ts` (+ numbering helper) and rewire both REST and actions as thin adapters; delete divergent implementations and the mass-assignment PATCH. → unblocks atomic numbering (single call site for the transaction).
3. **Atomic numbering (BUG-03).** Add `BastSequence` model + migration; `nextBastNumber()` inside the create transaction; write a concurrency test (12 parallel creates → 12 unique numbers).
4. **Role enforcement rollout (SEC-03).** Apply `requireRole` to every mutating endpoint + action per the sidebar role matrix, now trivial because services centralize the logic.
5. **Uploads (SEC-04).** `lib/storage.ts` seam, magic-byte/size validation, private dir, guarded serve route — swaps the storage backend later without touching handlers.
6. **Test suite (TEST-01).** Vitest infra + setup file FIRST (patterns above), then auth/RBAC matrix, then BAST workflow + numbering, then Playwright E2E for the critical flow. Tests for steps 1-5 are written alongside, not after.

Dependencies: 1 → {2,4} → 3 → 5; tests (6) can start after 1 and grow incrementally — the auth/RBAC matrix is the highest-ROI first suite (it would have caught both shipping bugs).

## Sources

- Next.js docs (authentication guide; proxy file convention; server actions) — **context7 /vercel/next.js** — MEDIUM (official, current for Next.js 16)
- Prisma docs + interactive-transactions functional tests — **context7 /prisma/prisma** — MEDIUM (official, high-concurrency FOR UPDATE test pattern)
- PostgreSQL docs "CREATE SEQUENCE" (gapless limitation), cybertec-postgresql.com "Sequences vs. Invoice numbers" / "Gaps in sequences" (Hans-Jürgen Schönig, Laurenz Albe) — LOW (authoritative vendor docs + expert blogs)
- CVE-2025-29927 middleware bypass discussion (Snyk advisory, vercel/next.js issues #81732) — LOW
- pean.dev "Next.js API Routes in 2026" (2026-05), frontendaccelerator.com "Server Actions vs Route Handlers" (2026-07), Paulund "Route Handlers vs Server Actions" (2026-04) — LOW (practitioner consensus, 2026)
- Testing: codewithseb.com "Testing Next.js 16" (2026-07), iamraghuveer.com "Testing Next.js: Unit, Integration, E2E" (2026-04), devcheolu.com "Mocking Next.js App Router Server APIs in Vitest" (2026-05), next-test-api-route-handler (Xunnamius), Pluralsight Vitest/Prisma guided lab — LOW
- Uploads: nextjslaunchpad.com upload guide (2026-03), cadence.withremote.ai (2026-05), samioda.com presigned-URL guide (2026-05), vercel/next.js discussion #16417 — LOW
- Next.js server-action security (matthewswong.com 2026-08, tomodahinata.com CSRF 2026-06, Auth0 Next.js 16 guide 2026-07) — LOW

---
*Architecture research for: EAMS hardening — Next.js 16 + Prisma service-layer consolidation, defense-in-depth authz, atomic numbering, test architecture, private uploads*
*Researched: 2026-08-10*