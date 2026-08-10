<!-- refreshed: 2026-08-10 -->
# Architecture

**Analysis Date:** 2026-08-10

## System Overview

```text
┌───────────────────────────────────────────────────────────────────┐
│                    Presentation (App Router pages)                 │
│  Pages: app/(authenticated)/<feature>/page.tsx (client-heavy)      │
│  Shell: app/(authenticated)/layout.tsx → components/app-sidebar    │
│  Shared UI: components/ (feature) + components/ui/ (shadcn)        │
└───────────────┬──────────────────────────────┬─────────────────────┘
                │ fetch() to REST routes       │ direct Prisma (server
                ▼                              ▼  components only)
┌──────────────────────────────┐   ┌────────────────────────────────┐
│     API Layer (REST)         │   │       Server Actions            │
│  app/api/**/route.ts         │   │  lib/actions/bast-actions.ts    │
│  e.g. app/api/assets/route.ts│   │  (create/approve/reject BAST)   │
└───────────────┬──────────────┘   └───────────────┬────────────────┘
                │                                  │
                ▼                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Domain / Shared Lib Layer                       │
│  lib/auth.ts (JWT+bcrypt) · lib/db.ts (Prisma) ·                  │
│  lib/api-response.ts (response contract) · lib/utils.ts (cn)      │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│      Data Store: PostgreSQL (Prisma ORM, prisma/schema.prisma)     │
│      File Store: public/uploads/assets/ (asset images)             │
└───────────────────────────────────────────────────────────────────┘
        Auth gate: proxy.ts (JWT middleware) guards all routes above
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Auth middleware | JWT cookie verification + route protection + redirects | `proxy.ts` |
| Auth domain logic | bcrypt hashing, JWT sign/verify, cookie helpers, role hierarchy | `lib/auth.ts` |
| Prisma singleton | Single PrismaClient instance (globalThis-cached) | `lib/db.ts` |
| API response contract | Uniform `{ success, data?, error?, message? }` JSON helpers | `lib/api-response.ts` |
| BAST server actions | Create/approve/reject BAST with `$transaction` + `revalidatePath` | `lib/actions/bast-actions.ts` |
| REST route handlers | CRUD for assets, users, bast, maintenance, categories, locations, divisions, dashboard, reports, auth | `app/api/**/route.ts` |
| Authenticated shell | Sidebar + header + user context for `(authenticated)` pages | `app/(authenticated)/layout.tsx` |
| Feature tables | TanStack table + dnd-kit powered data grids (assets, users, bast, maintenance, categories, locations) | `components/*-table.tsx` |
| CRUD dialogs | Create/edit/delete dialogs per feature, POST/PATCH/DELETE to REST routes or server actions | `components/*-dialog.tsx` |
| UI primitives | shadcn/ui components (new-york style) | `components/ui/*` |
| Data model | PostgreSQL schema: 8 models + 4 enums | `prisma/schema.prisma` |
| Seed data | Raw-SQL inserts for demo data (divisions, users, categories, locations, assets, BAST, maintenance) | `prisma/seed.ts` |

## Pattern Overview

**Overall:** Hybrid App Router application with REST-API-first data access. Most pages are client components ("use client") that fetch from REST route handlers on mount; a subset of pages (history, BAST print) are async server components that query Prisma directly and pass serialized props to client children. BAST write operations are additionally (and partially redundantly) exposed as server actions.

**Key Characteristics:**
- Client-side data fetching: `fetch("/api/...")` + `useState`/`useEffect` on every list/detail page — no React Query/SWR, no server-side data fetching on list pages
- Route handlers re-verify identity per request via `getCurrentUser()` (`lib/auth.ts:80-89`); the middleware-set `x-user-id`/`x-user-role` headers (`proxy.ts:49-54`) are never consumed by any route handler
- Per-route try/catch with `console.error` + structured error responses via `lib/api-response.ts`
- Server actions used only for BAST create (`components/create-bast-dialog.tsx:70`), approve/reject (`app/(authenticated)/bast/[id]/page.tsx:45,64`)
- Prisma `$transaction` for multi-step writes (BAST + BastDetail creation, BAST approve + asset status updates)
- Role-based navigation filtering is client-side only (`components/app-sidebar.tsx:91`); server-side role enforcement exists only in `app/api/users/route.ts` and `app/api/users/[id]/route.ts` via `hasMinimumRole`

## Layers

**Presentation:**
- Purpose: Render UI, hold client state, orchestrate data fetching
- Location: `app/`, `app/(authenticated)/`, `components/`
- Contains: Pages (`app/**/page.tsx`), feature components (`components/*-table.tsx`, `components/*-dialog.tsx`, `components/*-form.tsx`), UI primitives (`components/ui/*`)
- Depends on: REST routes (`/api/*`), server actions (`lib/actions/bast-actions.ts`), `lib/utils.ts`
- Used by: Browser

**API Layer (REST):**
- Purpose: HTTP interface for CRUD + aggregations; JWT-gated
- Location: `app/api/**/route.ts` (23 route handlers)
- Contains: Route handlers exporting `GET`/`POST`/`PATCH`/`DELETE`
- Depends on: `lib/db.ts`, `lib/auth.ts`, `lib/api-response.ts`, Prisma enums
- Used by: Client pages and dialogs via `fetch()`

**Server Actions:**
- Purpose: Direct server-side mutations for BAST lifecycle (used from dialogs/detail pages)
- Location: `lib/actions/bast-actions.ts`
- Depends on: `lib/db.ts`, `lib/auth.ts`, `next/cache` (`revalidatePath`)
- Used by: `components/create-bast-dialog.tsx`, `app/(authenticated)/bast/[id]/page.tsx`

**Domain / Shared Lib:**
- Purpose: Cross-cutting primitives — auth, DB client, response contract, utilities
- Location: `lib/`
- Contains: `lib/auth.ts`, `lib/db.ts`, `lib/api-response.ts`, `lib/utils.ts`
- Depends on: `@prisma/client`, `jose`, `bcryptjs`, `next/headers`, `next/server`, `clsx`, `tailwind-merge`
- Used by: Every route handler, server action, and server component

**Data Access:**
- Purpose: ORM client + schema definition
- Location: `lib/db.ts` (singleton), `prisma/schema.prisma` (schema), `prisma/seed.ts` (seed)
- Depends on: PostgreSQL via `DATABASE_URL` (pooled) + `DIRECT_URL` (`prisma/schema.prisma:6-9`)
- Used by: API layer, server actions, server components

## Data Flow

### Primary Request Path — List/Detail Pages (REST)

1. Client page mounts and calls fetch: `app/(authenticated)/assets/page.tsx:38-61` (`fetchAssets()` builds `URLSearchParams`, calls `fetch("/api/assets?...")`)
2. Middleware `proxy.ts:12-57` verifies JWT cookie first (unless path is `/api/auth/login` or `/api/auth/register`)
3. Route handler authenticates again: `app/api/assets/route.ts:11-15` (`getCurrentUser()` → `unauthorizedResponse()` if missing)
4. Handler builds `where` clause, runs `db.asset.findMany` + `db.asset.count` in parallel: `app/api/assets/route.ts:43-66`
5. Handler returns `successResponse({ assets, pagination })`: `app/api/assets/route.ts:68-76`
6. Client stores `data.data.assets` + `data.data.pagination.total` in state and renders `<AssetsTable>`: `app/(authenticated)/assets/page.tsx:52-54,188`

### Auth Entry Flow

1. `components/login-form.tsx` submits credentials to `POST /api/auth/login` (skipped by middleware: `proxy.ts:16-18`)
2. `app/api/auth/login/route.ts:18-44` looks up user, `verifyPassword` (bcrypt), `generateToken` (JWT HS256, 7d), `setAuthCookie` (httpOnly `auth-token`)
3. Subsequent requests hit `proxy.ts:24-41` — protected path + invalid token → 401 JSON (API) or redirect to `/login` (pages)
4. Each API route independently re-verifies via `getCurrentUser()` (`lib/auth.ts:80-89`) — `proxy.ts` headers `x-user-id`/`x-user-role` are set but unused downstream

### BAST Approve Flow — Server Action

1. `app/(authenticated)/bast/[id]/page.tsx:42-59` calls `approveBast(params.id)` (imported from `lib/actions/bast-actions.ts`)
2. `lib/actions/bast-actions.ts:101-179` runs `db.$transaction`: loads BAST + details, branches on `bast.type` to mutate asset `status`/`holderId`/`locationId`, sets BAST `APPROVED` + `approverId`
3. `revalidatePath("/bast")`, `/bast/${id}`, `/assets` — `lib/actions/bast-actions.ts:171-173`
4. Client refetches via `fetchBast()` (`app/(authenticated)/bast/[id]/page.tsx:47`)

### BAST Approve Flow — REST (parallel/duplicated implementation)

1. `POST /api/bast/[id]/approve` → `app/api/bast/[id]/approve/route.ts:7-89`
2. Same transaction shape but **different branch coverage**: no `PROCUREMENT`/`MAINTENANCE_IN`/`STOCK_OPNAME` cases, and `MAINTENANCE_OUT` auto-creates a Maintenance row (`app/api/bast/[id]/approve/route.ts:62-70`) — the server action does not
3. No `revalidatePath` calls (data staleness risk)

### Server-Rendered Flow — History Timeline

1. `app/(authenticated)/history/page.tsx:6-58` is an async server component: `getCurrentUser()` → `redirect("/login")` if absent; queries `db.bast.findMany(take: 100)` + `db.maintenance.findMany(take: 100)`
2. Normalizes into a unified `timeline` array and passes it to client child `<HistoryClient initialData={timeline} />`: `app/(authenticated)/history/page.tsx:57`
3. `components`/`app/(authenticated)/history/history-client.tsx` filters/sorts/paginates client-side

### Server-Rendered Flow — BAST Print

1. `app/bast/[id]/print/page.tsx:6-53` (outside the `(authenticated)` route group): `getCurrentUser()` + `redirect`, `db.bast.findUnique` with `creator`, `approver`, `details.asset.category`
2. Renders `<BastPrintView bast={bast} />` (`components/bast-print-view.tsx`) and auto-triggers `window.print()` via inline script

### File Upload Flow

1. `app/(authenticated)/assets/[id]/page.tsx:69-80` posts `FormData` to `POST /api/assets/[id]/images`
2. `app/api/assets/[id]/images/route.ts:31-47` writes file to `public/uploads/assets/${id}-${Date.now()}-${cleanFileName}` and stores `/uploads/assets/...` in `Asset.imagePath`

**State Management:**
- No global store (no Redux/Zustand/React Query). Each page owns `useState` + mount-time `fetch`; dialogs receive `onSuccess` callbacks to trigger refetch (e.g., `app/(authenticated)/assets/page.tsx:191-199`)
- Server cache invalidation only via `revalidatePath` in `lib/actions/bast-actions.ts`
- Auth state lives in the httpOnly cookie `auth-token`; user object passed into the shell from the server layout (`app/(authenticated)/layout.tsx:7`)

## Key Abstractions

**ApiResponse envelope:**
- Purpose: Uniform JSON contract for all API responses
- Examples: `lib/api-response.ts` (`successResponse`, `errorResponse`, `unauthorizedResponse`, `forbiddenResponse`, `notFoundResponse`, `validationErrorResponse`)
- Pattern: `{ success: boolean, data?: T, error?: string, message?: string }` (`lib/api-response.ts:4-9`)

**JWTPayload:**
- Purpose: Signed user identity carried in the `auth-token` cookie
- Examples: `lib/auth.ts:12-18`, generated in `app/api/auth/login/route.ts:36-41`
- Pattern: `{ userId, email, role, fullName }` signed HS256 with 7d expiry (`lib/auth.ts:37-43`)

**Prisma singleton:**
- Purpose: Prevents PrismaClient hot-reload exhaustion in dev
- Examples: `lib/db.ts:7-17`
- Pattern: `globalThis.prisma` cache, dev query logging

**Role hierarchy:**
- Purpose: Numeric comparison for authorization
- Examples: `lib/auth.ts:109-122` (`ROLE_HIERARCHY`, `hasMinimumRole`)
- Pattern: SUPER_ADMIN(5) → ADMIN_INSTANSI(4) → STAFF_ASSET(3) → TEKNISI(2) → EMPLOYEE(1); enforced only in `app/api/users/route.ts:18,108` and `app/api/users/[id]/route.ts:21,73,94,135`

**Data table wrapper:**
- Purpose: Reusable sortable/paginated/faceted table
- Examples: `components/data-table.tsx` (807 lines), consumed by `components/assets-table.tsx` etc.
- Pattern: `@tanstack/react-table` + `@dnd-kit` sorting + recharts sparkline + zod column schemas

## Entry Points

**Landing page:**
- Location: `app/page.tsx`
- Triggers: `GET /`
- Responsibilities: Public marketing hero + features (`components/landing-components.tsx`)

**Login page:**
- Location: `app/login/page.tsx`
- Triggers: `GET /login` (public; middleware redirects here for unauthenticated users)
- Responsibilities: Renders `components/login-form.tsx`

**Authenticated shell:**
- Location: `app/(authenticated)/layout.tsx`
- Triggers: All routes under `(authenticated)` group
- Responsibilities: `getCurrentUser`, renders `AppSidebar` + `SiteHeader` + children

**Feature pages (9):**
- `app/(authenticated)/dashboard/page.tsx` — GET `/api/dashboard` aggregates (`app/api/dashboard/route.ts`)
- `app/(authenticated)/assets/page.tsx` + `app/(authenticated)/assets/[id]/page.tsx`
- `app/(authenticated)/bast/page.tsx` + `app/(authenticated)/bast/[id]/page.tsx`
- `app/(authenticated)/maintenance/page.tsx`
- `app/(authenticated)/categories/page.tsx`
- `app/(authenticated)/locations/page.tsx`
- `app/(authenticated)/users/page.tsx`
- `app/(authenticated)/reports/page.tsx`
- `app/(authenticated)/history/page.tsx` (server component)

**REST API (23 route handlers) under `app/api/`:**
- `auth/`: `login`, `register`, `logout`, `me`
- `assets/`, `assets/[id]`, `assets/[id]/images`, `assets/[id]/return`
- `bast/`, `bast/[id]`, `bast/[id]/approve`, `bast/[id]/reject`
- `maintenance/`, `maintenance/[id]`
- `categories/`, `categories/[id]`
- `locations/`, `locations/[id]`
- `divisions/`
- `users/`, `users/[id]`
- `dashboard/`, `reports/`

**Print view:**
- Location: `app/bast/[id]/print/page.tsx`
- Triggers: `GET /bast/[id]/print` (outside authenticated group, self-guards)

**Middleware:**
- Location: `proxy.ts` (Next.js 16 middleware/proxy file)
- Triggers: Every request except `_next/static`, `_next/image`, `favicon.ico`, static assets

**Seeding/scripts:**
- `prisma/seed.ts` (raw-SQL demo data; run via `npm run prisma:seed` per `package.json` `prisma.seed` = `tsx prisma/seed.ts`)
- `scripts/fix-login.ts`, `scripts/generate-hash.mjs`, `scripts/reset-admin-password.{mjs,ts}` (ad-hoc admin utilities)

## Architectural Constraints

- **Global state:** Single PrismaClient on `globalThis` (`lib/db.ts:7-17`). JWT secret read at module load from `process.env.JWT_SECRET` with an in-code fallback (`lib/auth.ts:8`) — secure only when env var is set.
- **Route protection model:** Static list in `proxy.ts:7` — any new protected route must be added to `protectedRoutes`; the `(authenticated)` route group itself does no server-side guarding. Pages relying on `getCurrentUser` + `redirect` self-guard (history, print) but most list pages rely solely on the middleware.
- **Double authentication:** Middleware verifies JWT, then every route handler verifies again via `getCurrentUser()`. The `x-user-id`/`x-user-role` headers set in `proxy.ts:49-54` are never read by handlers — dead plumbing.
- **Duplicated BAST lifecycle logic:** Approve/reject/create exist in both `lib/actions/bast-actions.ts` and `app/api/bast/route.ts` + `app/api/bast/[id]/approve/route.ts` + `app/api/bast/[id]/reject/route.ts` with divergent behavior (see Data Flow). Keep both in sync when changing BAST semantics.
- **Circular imports:** None detected. Dependency direction is strictly pages/components → lib → Prisma.
- **Server/client boundary:** `lib/actions/bast-actions.ts` is `"use server"` and must only be imported from client components; `lib/db.ts` and `lib/auth.ts` (cookie-dependent) are server-only — never import into client components.

## Anti-Patterns

### Duplicated business logic (REST handlers vs server actions)

**What happens:** BAST create/approve/reject are implemented twice — `app/api/bast/route.ts`, `app/api/bast/[id]/approve/route.ts`, `app/api/bast/[id]/reject/route.ts` and `lib/actions/bast-actions.ts` — with different type-coverage and side effects (e.g., approve branch coverage differs; API approve auto-creates Maintenance on `MAINTENANCE_OUT`, server action does not).
**Why it's wrong:** Behavior drifts; fixes must be applied twice; the REST approval path skips `revalidatePath`, leaving stale UI.
**Do this instead:** Pick one mutation surface per operation. Prefer server actions (they support `revalidatePath`); remove `app/api/bast/[id]/approve/route.ts` and `app/api/bast/[id]/reject/route.ts`, or centralize shared logic in a lib module called by both.

### Client-side-only role gating

**What happens:** Sidebar filters nav items by role (`components/app-sidebar.tsx:91`) but API routes generally only check authentication, not authorization. Any authenticated user can call `/api/users` GET (list) — role checks exist only in the two users routes.
**Why it's wrong:** Privilege escalation risk: e.g., a `TEKNISI` or `EMPLOYEE` can hit arbitrary admin-capable endpoints directly.
**Do this instead:** Enforce `hasMinimumRole`/`hasRole` at the top of every route handler per the sidebar's role matrix (`components/app-sidebar.tsx:25-89`).

### Pervasive `any` typing in handlers

**What happens:** `where: any` clauses (`app/api/assets/route.ts:28`), `body` destructuring from `request.json()` without zod schemas (`app/api/assets/route.ts:94`), `updateData: any` (`lib/actions/bast-actions.ts:119`), page state typed `useState<any[]>` (`app/(authenticated)/assets/page.tsx:15`).
**Why it's wrong:** Loses type safety at the API boundary; typos in where-clauses surface as runtime errors.
**Do this instead:** Define zod schemas per resource (zod is already a dependency and used in `components/data-table.tsx`) and type API responses with Prisma's generated types.

### Runtime writes into `public/`

**What happens:** Uploads are written into `public/uploads/assets/` at runtime (`app/api/assets/[id]/images/route.ts:31-47`).
**Why it's wrong:** `public/` is a static build artifact directory; runtime files can be lost on redeploy and are not served in all production setups.
**Do this instead:** Persist images to object storage (S3-compatible) or a dedicated uploads volume served via a route handler.

## Error Handling

**Strategy:** Per-handler try/catch. Route handlers catch → `console.error` → `errorResponse(message, 500)`. Server actions catch → `console.error` → return `{ success: false, error: message }`; auth failures outside try/catch `throw new Error("Unauthorized")` (`lib/actions/bast-actions.ts:29-32,104-106`).

**Patterns:**
- Helper responses: `successResponse`/`errorResponse`/`unauthorizedResponse`/`forbiddenResponse`/`notFoundResponse`/`validationErrorResponse` (`lib/api-response.ts`)
- Client reads `data.success` and toasts `data.error` (e.g., `app/(authenticated)/assets/page.tsx:105-110`)
- No `app/**/error.tsx`, `loading.tsx`, or `not-found.tsx` boundaries exist anywhere in `app/`

## Cross-Cutting Concerns

**Logging:** `console.error` in every route handler/action catch block; Prisma dev query logging via `lib/db.ts:14`. No structured logger, no request IDs.

**Validation:** Manual, per-route field presence checks (e.g., `app/api/assets/route.ts:97-99`). `zod` used only inside `components/data-table.tsx` column configs, not at API boundaries. `react-hook-form` + `@hookform/resolvers` used in dialogs (`components/create-asset-dialog.tsx` references `zod`/`react-hook-form` via `package.json` deps).

**Authentication:** JWT (HS256, `jose`) in httpOnly `auth-token` cookie, 7d maxAge (`lib/auth.ts:37-75`). bcrypt cost 12 for hashing (`lib/auth.ts:24`). Authorization: `hasMinimumRole` only in users routes.

**Theming:** `next-themes` provider in `app/layout.tsx:32`; Tailwind v4 CSS vars in `app/globals.css`; `components/theme-switcher.tsx`.

---

*Architecture analysis: 2026-08-10*