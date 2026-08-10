# Codebase Structure

**Analysis Date:** 2026-08-10

## Directory Layout

```
asset-management/
├── app/                        # Next.js App Router — pages + API routes
│   ├── layout.tsx              # Root layout: ThemeProvider, TooltipProvider, Toaster
│   ├── page.tsx                # Public landing page (client)
│   ├── globals.css             # Tailwind v4 entry + CSS variables
│   ├── login/                  # GET /login (public login page)
│   ├── (authenticated)/        # Route group — app shell + 9 feature areas
│   │   ├── layout.tsx          # Sidebar + SiteHeader shell (server component)
│   │   ├── dashboard/          # GET /dashboard
│   │   ├── assets/             # GET /assets, GET /assets/[id]
│   │   ├── bast/               # GET /bast, GET /bast/[id]
│   │   ├── maintenance/        # GET /maintenance
│   │   ├── categories/         # GET /categories
│   │   ├── locations/          # GET /locations
│   │   ├── users/              # GET /users
│   │   ├── reports/            # GET /reports
│   │   └── history/            # GET /history (server component + client child)
│   ├── bast/                   # GET /bast/[id]/print (outside route group, self-guarded)
│   └── api/                    # REST route handlers (23 files)
│       ├── auth/               # login, register, logout, me
│       ├── assets/             # + [id], [id]/images, [id]/return
│       ├── bast/               # + [id], [id]/approve, [id]/reject
│       ├── maintenance/        # + [id]
│       ├── categories/         # + [id]
│       ├── locations/          # + [id]
│       ├── divisions/
│       ├── users/              # + [id]
│       ├── dashboard/
│       └── reports/
├── components/                 # React components
│   ├── ui/                     # shadcn/ui primitives (button, dialog, sidebar, ...)
│   ├── *-table.tsx             # Feature tables (assets, users, bast, maintenance, categories, locations)
│   ├── *-dialog.tsx            # CRUD dialogs (create-/edit-/delete- per feature)
│   ├── data-table.tsx          # Generic sortable/paginated table wrapper
│   ├── app-sidebar.tsx         # Role-filtered navigation shell
│   ├── site-header.tsx         # Top bar
│   ├── dashboard-*.tsx         # stats, charts, recent-bast, section-cards
│   ├── login-form.tsx          # Login form (POST /api/auth/login)
│   ├── bast-print-view.tsx     # Printable BAST document
│   ├── qr-scanner-dialog.tsx   # html5-qrcode scanner
│   └── landing-components.tsx  # Marketing hero/features
├── hooks/                      # use-toast.ts, use-mobile.ts (shadcn-generated)
├── lib/                        # Server-side domain layer
│   ├── auth.ts                 # JWT + bcrypt + cookie helpers + role hierarchy
│   ├── db.ts                   # PrismaClient singleton
│   ├── api-response.ts         # JSON response envelope helpers
│   ├── utils.ts                # cn(), formatCurrency()
│   └── actions/                # Server actions ("use server")
│       └── bast-actions.ts     # create/approve/reject BAST
├── prisma/
│   ├── schema.prisma           # PostgreSQL schema (8 models, 4 enums)
│   └── seed.ts                 # Raw-SQL seed script
├── public/
│   └── uploads/assets/         # Runtime asset image uploads
├── scripts/                    # Ad-hoc admin utilities (reset passwords, hashes)
├── proxy.ts                    # Next.js middleware — JWT route protection
├── seed.sql                    # SQL dump (reference)
├── package.json                # deps/scripts; "antigravity" name
├── tsconfig.json               # strict TS, @/* path alias -> root
├── next.config.ts              # Empty defaults
├── components.json             # shadcn config (new-york, RSC)
├── eslint.config.mjs           # ESLint 9 flat config
├── postcss.config.mjs          # Tailwind v4 postcss
└── *.md                        # README.md, BACKEND_README.md, USERGUIDE.md, TESTING_CHECKLIST.md
```

## Directory Purposes

**`app/`** — App Router root. Contains route groups, pages, and all REST handlers.
- Key files: `app/layout.tsx` (root layout — theme/tooltip/toaster providers), `app/page.tsx` (landing), `app/globals.css` (Tailwind v4 + CSS vars)

**`app/(authenticated)/`** — Route group for all logged-in feature areas. Shared by `app/(authenticated)/layout.tsx`, which renders `components/app-sidebar.tsx` + `components/site-header.tsx`. Protection is provided by `proxy.ts` (middleware), not by the group itself.
- Subdirs: `dashboard/`, `assets/`, `bast/`, `maintenance/`, `categories/`, `locations/`, `users/`, `reports/`, `history/`

**`app/api/`** — REST route handlers, one directory per resource, `[id]` segments for detail routes.
- Nested action routes follow `<resource>/[id]/<verb>`: `app/api/bast/[id]/approve/route.ts`, `app/api/bast/[id]/reject/route.ts`, `app/api/assets/[id]/return/route.ts`, `app/api/assets/[id]/images/route.ts`

**`components/`** — All shared components. Two tiers:
- `components/ui/` — shadcn/ui generated primitives (29 files: `button.tsx`, `dialog.tsx`, `sidebar.tsx`, `table.tsx`, `form.tsx`, ...). Do not hand-edit with feature logic; regenerate via shadcn CLI.
- Top-level — feature/organization components, named by role: `assets-table.tsx`, `create-asset-dialog.tsx`, `edit-user-dialog.tsx`, `delete-maintenance-dialog.tsx`, etc.

**`hooks/`** — shadcn-generated hooks only: `hooks/use-mobile.ts` (breakpoint), `hooks/use-toast.ts` (toast state).

**`lib/`** — Server-only domain layer. Never import `lib/db.ts` or `lib/auth.ts` from client components.
- `lib/actions/` — server actions marked `"use server"`

**`prisma/`** — Schema and seed. `prisma/schema.prisma` defines `Division`, `Location`, `Category`, `User`, `Asset`, `Bast`, `BastDetail`, `Maintenance`, `AuditLog` + enums `UserRole`, `AssetStatus`, `AssetCondition`, `BastType`.

**`public/uploads/assets/`** — Runtime-written asset image storage (written by `app/api/assets/[id]/images/route.ts`).

**`scripts/`** — Standalone maintenance scripts: `scripts/generate-hash.mjs`, `scripts/reset-admin-password.mjs`/`.ts`, `scripts/fix-login.ts`.

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Public landing (`/`)
- `app/login/page.tsx`: Login page (`/login`)
- `app/(authenticated)/layout.tsx`: Authenticated app shell
- `proxy.ts`: Middleware — JWT route gate
- `prisma/seed.ts`: Seed entry (`package.json` `prisma.seed` = `tsx prisma/seed.ts`)

**Configuration:**
- `next.config.ts`: Next.js config (defaults)
- `tsconfig.json`: Strict TS, `@/*` -> project root
- `components.json`: shadcn config — style `new-york`, RSC enabled, `iconLibrary: lucide`, aliases `ui: "@/components/ui"`, `utils: "@/lib/utils"`, `hooks: "@/hooks"`
- `eslint.config.mjs`: ESLint 9 flat + `eslint-config-next`
- `postcss.config.mjs`: Tailwind v4
- Environment: `.env` file present (existence noted, contents not read) — expects `DATABASE_URL`, `DIRECT_URL` (per `prisma/schema.prisma:6-9`), `JWT_SECRET` (per `lib/auth.ts:8`)

**Core Logic:**
- `lib/auth.ts`: JWT sign/verify (`jose`, HS256), bcrypt hash/verify, cookie helpers, `ROLE_HIERARCHY`/`hasMinimumRole`
- `lib/db.ts`: PrismaClient singleton (`globalThis` cache)
- `lib/api-response.ts`: `successResponse`, `errorResponse`, `unauthorizedResponse`, `forbiddenResponse`, `notFoundResponse`, `validationErrorResponse`
- `lib/actions/bast-actions.ts`: BAST create/approve/reject server actions with `$transaction`
- `lib/utils.ts`: `cn()` (clsx + tailwind-merge), `formatCurrency()` (IDR)

**API Handlers (most complex examples):**
- `app/api/assets/route.ts`: GET with pagination + filters, POST with tag-number uniqueness check
- `app/api/assets/[id]/route.ts`: GET/PATCH/DELETE (soft-delete via `DISPOSED`)
- `app/api/dashboard/route.ts`: Multi-aggregation dashboard payload
- `app/api/bast/[id]/approve/route.ts`: BAST approval transaction (duplicated logic — see `ARCHITECTURE.md`)
- `app/api/users/route.ts`: Only routes with role-based authorization (`hasMinimumRole`)
- `app/api/reports/route.ts`: GroupBy aggregations for the reports page

**Testing:**
- No test files, no test runner config (`jest.config.*`/`vitest.config.*` absent). `TESTING_CHECKLIST.md` is a manual QA checklist, not automated tests.

## Naming Conventions

**Files:**
- `kebab-case` for pages, components, hooks, lib files, and scripts: `app/(authenticated)/assets/page.tsx`, `components/create-asset-dialog.tsx`, `hooks/use-mobile.ts`, `lib/api-response.ts`
- Resource directories are singular nouns: `app/api/assets/`, `app/api/categories/`, `app/api/divisions/`
- Dynamic segments use `[id]` bracket notation
- Route-group directories use parentheses: `app/(authenticated)/`
- Route handlers are always `route.ts`; pages always `page.tsx`; client children of server pages use `*-client.tsx` suffix (e.g., `app/(authenticated)/history/history-client.tsx`)

**Directories:**
- `app/api/<resource>/` -> REST resource (with `[id]` + optional `<verb>` subroutes)
- `components/` -> flat feature components + `ui/` for shadcn primitives
- `lib/actions/` -> server actions (`"use server"`)
- `prisma/` -> schema + seed
- `scripts/` -> standalone utilities

**Functions:**
- Named exports everywhere; no default exports except Next.js page/layout components (`export default function Page()`)
- Route handlers exported as `export async function GET/POST/PATCH/DELETE`
- Server actions named after the operation: `createBast`, `approveBast`, `rejectBast`
- Response helpers prefix by intent: `successResponse`, `errorResponse`, `unauthorizedResponse`, `forbiddenResponse`, `notFoundResponse`, `validationErrorResponse`
- Auth helpers prefix by intent: `hashPassword`, `verifyPassword`, `generateToken`, `verifyToken`, `setAuthCookie`, `getCurrentUser`, `clearAuthCookie`, `hasRole`, `hasMinimumRole`

## Where to Add New Code

**New Feature (list + CRUD):**
- Primary code: `app/(authenticated)/<feature>/page.tsx` — follow the client pattern: mount-fetch via `useEffect`, `fetch("/api/<feature>?...")`, render table + dialogs
- Table component: `components/<feature>-table.tsx` (wrap `components/data-table.tsx`)
- Create/edit/delete dialogs: `components/create-<feature>-dialog.tsx`, `components/edit-<feature>-dialog.tsx`, `components/delete-<feature>-dialog.tsx`
- API: REST in `app/api/<feature>/route.ts` + `app/api/<feature>/[id]/route.ts` (or server actions under `lib/actions/` for mutations that need `revalidatePath`)
- Tests: none exist yet — no test scaffold in repo

**New API Endpoint:**
- REST: add `app/api/<resource>/route.ts` (or `[id]` variant). Must: `getCurrentUser()` + `unauthorizedResponse()`, wrap in try/catch, return `successResponse`/`errorResponse`
- Add the path prefix to `protectedRoutes` in `proxy.ts:7` if it must be JWT-gated

**New Server Action:**
- Implementation: `lib/actions/bast-actions.ts` pattern — `"use server"` directive, `getCurrentUser()` guard, `$transaction` for multi-write, `revalidatePath` after mutation

**New shadcn UI primitive:**
- Run `npx shadcn@latest add <component>` to place it in `components/ui/`

**New Server-Rendered Page (data-driven, no REST):**
- Follow `app/(authenticated)/history/page.tsx` pattern: async server component, `getCurrentUser()` + `redirect("/login")`, direct Prisma query, pass serialized props to a `*-client.tsx` child

**Utilities:**
- Shared client helpers: `lib/utils.ts` (alongside `cn()`, `formatCurrency()`)
- Auth/DB/response helpers: `lib/` (server-only)

## Special Directories

**`node_modules/`:** Installed dependencies — not committed.
**`.next/`:** Next.js build output — generated, not committed.
**`public/uploads/assets/`:** Runtime-written uploads — generated at runtime, committed state unclear (contains user-uploaded images).
**`.planning/`:** GSD workflow artifacts (plans, codebase maps) — not application code.
**`prisma/`:** Schema + seed — source of truth for the data model; migrations directory not present in repo root scan.

---

*Structure analysis: 2026-08-10*