<!-- GSD:project-start source:PROJECT.md -->

## Project

**EAMS — Enterprise Asset Management System**

Sistem manajemen aset perusahaan (EAMS) berbasis web untuk mengelola siklus hidup aset: pencatatan aset, serah terima (BAST), pemeliharaan, dan pelaporan. Dibangun dengan Next.js 16 App Router + Prisma/PostgreSQL, dengan autentikasi JWT berbasis peran (SUPER_ADMIN → EMPLOYEE).

**Core Value:** Siklus hidup aset tercatat dan terlacak dengan benar — dari pengadaan, serah terima (BAST), pemeliharaan, hingga disposal — dengan otorisasi peran yang aman di setiap langkah.

### Constraints

- **Tech stack**: Next.js 16 App Router + Prisma/PostgreSQL + Tailwind v4 — sudah terpasang, tidak diganti
- **Kompatibilitas**: TypeScript strict mode aktif — perbaikan tidak boleh menambah `any` baru
- **Keamanan**: JWT_SECRET harus dari env; tidak boleh ada fallback konstanta
- **Data**: Skema Prisma adalah source of truth; perubahan skema butuh migrasi
- **Deployment**: Belum ada target hosting; upload lokal `public/uploads/` butuh volume persisten

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript ^5 (strict mode, target ES2017) - Entire application, full-stack (server components, API routes, client components). See `tsconfig.json`, which sets `strict: true`, `moduleResolution: "bundler"`, and the `@/*` path alias mapping to `./*`.
- SQL (PostgreSQL dialect) - Seed data via raw SQL in `prisma/seed.ts` and `seed.sql`
- CSS - Tailwind CSS v4 directives in `app/globals.css`
- HTML/TSX - React components in `app/` and `components/`

## Runtime

- Node.js (no `.nvmrc` or `engines` field specified; Next.js 16 requires Node 18.18+)
- Package name: `antigravity` v0.1.0 (private) per `package.json`
- npm
- Lockfile: `package-lock.json` present (committed, should be used for reproducible installs)

## Frameworks

- Next.js 16.3.0 (installed; `package.json` declares `^16.3.0`) - App Router fullstack framework; server-rendered pages, React Server Components, and API route handlers
- React 19.2.3 (with React DOM 19.2.3) - UI library
- Tailwind CSS 4.1.18 - CSS framework via `@tailwindcss/postcss` plugin configured in `postcss.config.mjs` (no `tailwind.config` file — v4 CSS-first config)
- shadcn/ui 3.8.4 - Component system; `components.json` uses "new-york" style, `rsc: true`, baseColor "slate", icon library "lucide"; generated components live in `components/ui/`
- Prisma ORM 6.19.3 (CLI) / `@prisma/client` 6.19.0 - Database access; schema at `prisma/schema.prisma`
- Not detected - no test framework, no test files, no jest/vitest config, and no test scripts in `package.json`
- TypeScript ^5 - Type checking (via Next.js build)
- ESLint 9 - Flat config `eslint.config.mjs` (extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`); command: `npm run lint`
- tsx ^4.21.0 - Runs TypeScript scripts directly (`prisma/seed.ts`, `scripts/fix-login.ts`, `scripts/reset-admin-password.ts`); also the Prisma seed runner per the `prisma.seed` field in `package.json`
- shadcn CLI - Component scaffolding (`components.json`)
- tw-animate-css ^1.4.0 - Animation utilities for Tailwind v4

## Key Dependencies

- `next` ^16.3.0 - Application framework and server
- `@prisma/client` 6.19.0 - Type-safe database client; singleton exported from `lib/db.ts` (uses `globalThis` caching to avoid duplicate clients in dev)
- `jose` ^6.1.3 - JWT signing/verification (HS256, 7-day expiry); used in `lib/auth.ts`
- `bcryptjs` ^3.0.3 - Password hashing (bcrypt, 12 rounds); used in `lib/auth.ts`
- `zod` ^4.3.6 - Schema validation for forms and API input validation
- `react-hook-form` ^7.71.1 + `@hookform/resolvers` ^5.2.2 - Form state management with zod integration
- `dotenv` ^17.2.4 - Environment loading in scripts
- `radix-ui` ^1.4.3 - Headless UI primitives (bundled shadcn/ui dependency)
- `lucide-react` ^0.563.0 - Primary icon set (shadcn icon library)
- `@tabler/icons-react` ^3.36.1 - Secondary icon set
- `class-variance-authority` ^0.7.1 + `clsx` ^2.1.1 + `tailwind-merge` ^3.4.0 - Class composition; combined in `cn()` helper at `lib/utils.ts`
- `framer-motion` ^12.34.3 - Animations (`components/theme-transition.tsx`)
- `sonner` ^2.0.7 - Toast notifications, mounted via `<Toaster />` in `app/layout.tsx`
- `vaul` ^1.1.2 - Drawer component
- `next-themes` ^0.4.6 - Dark/light theme (`components/theme-provider.tsx`)
- `@tanstack/react-table` ^8.21.3 - Table data grid
- `recharts` ^2.15.4 - Charts for dashboard/reports
- `date-fns` ^4.1.0 - Date formatting
- `@dnd-kit/core` ^6.3.1, `@dnd-kit/modifiers` ^9.0.0, `@dnd-kit/sortable` ^10.0.0, `@dnd-kit/utilities` ^3.2.2 - Sortable lists
- `html5-qrcode` ^2.3.8 - QR code scanning (asset identification)

## Configuration

- Environment variables are loaded from `.env` (file itself is gitignored via `.env*` in `.gitignore`; no `.env.example` committed)
- `process.env` usage is concentrated in two files:
- `lib/db.ts` - `NODE_ENV` controls Prisma log level (query/error/warn in dev, error only in production)
- `next.config.ts` - Empty default config (no custom settings)
- `tsconfig.json` - Strict TS config; `@/*` → `./*` path alias; includes `.next/types/**/*.ts`
- `postcss.config.mjs` - `@tailwindcss/postcss` plugin only
- `eslint.config.mjs` - Flat config with Next.js core-web-vitals + TypeScript rulesets
- `components.json` - shadcn/ui registry config

## Platform Requirements

- Node.js runtime with npm
- PostgreSQL database reachable at `DATABASE_URL` (and `DIRECT_URL` for direct connections)
- `JWT_SECRET` set in `.env` for authentication
- Run with `npm run dev` (Next.js dev server on port 3000, per `package.json`)
- Deploy target not explicitly configured (no `vercel.json`, Dockerfile, CI workflow, or hosting config detected; README references Vercel as the default `create-next-app` deployment path)
- `npm run build` then `npm start` for self-hosting
- Note: uploaded asset images are written to `public/uploads/assets/` on the local filesystem (`app/api/assets/[id]/images/route.ts`) — a persistent volume/filesystem is required in any deployment

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- `kebab-case.tsx` / `kebab-case.ts` for all app code: `create-asset-dialog.tsx`, `assets-table.tsx`, `bast-actions.ts`, `api-response.ts`
- Pages are per-feature directories under `app/(authenticated)/<feature>/page.tsx` (e.g. `app/(authenticated)/assets/page.tsx`)
- API route handlers: `app/api/<resource>/route.ts`; dynamic routes use `[id]` folders: `app/api/assets/[id]/route.ts`
- Prisma schema models: `PascalCase` singular (`Division`, `BastDetail`, `AuditLog`); Prisma enums `SCREAMING_SNAKE_CASE` (`SUPER_ADMIN`, `IN_MAINTENANCE`, `MAINTENANCE_OUT`)
- Seed/script files: `scripts/*.mjs` or `scripts/*.ts` (`generate-hash.mjs`, `reset-admin-password.ts`)
- `camelCase` for all functions: `fetchAssets`, `handleSubmit`, `createBast`, `generateToken`, `getCurrentUser`
- Event handlers prefixed `handle*`: `handleImageChange`, `handleSubmit`, `handleExport`, `handleSearch`
- Data fetchers prefixed `fetch*`: `fetchAssets`, `fetchCategories`, `fetchLocations`
- Page components `PascalCase` with `Page` suffix, exported as default: `export default function AssetsPage()` (`app/(authenticated)/assets/page.tsx`)
- Hooks prefixed `use`: `useIsMobile` (`hooks/use-mobile.ts`), `useToast` (`hooks/use-toast.ts`)
- `camelCase`: `existingCount`, `bastNumber`, `isValidPassword`, `formData`, `imagePreview`
- Module-level constants: `SCREAMING_SNAKE_CASE`: `TOKEN_NAME` (`lib/auth.ts`), `MOBILE_BREAKPOINT` (`hooks/use-mobile.ts`), `ROLE_HIERARCHY` (`lib/auth.ts`)
- Component state reflects API response shape loosely, often `any[]`: `const [assets, setAssets] = useState<any[]>([]);` (`app/(authenticated)/assets/page.tsx`)
- Interfaces `PascalCase`, component props suffixed `Props`: `CreateAssetDialogProps` (`components/create-asset-dialog.tsx`), `CreateBastInput` (`lib/actions/bast-actions.ts`), `JWTPayload` (`lib/auth.ts`), `ApiResponse<T>` (`lib/api-response.ts`)
- Interface-based (not `type` aliases) for props and payloads; `z.infer<typeof formSchema>` used for form types (`components/create-category-dialog.tsx`)
- `T = any` default generic used in `ApiResponse<T = any>` (`lib/api-response.ts`)

## Code Style

- No Prettier config detected (no `.prettierrc*` at repo root); formatting is manual. Two coexisting styles:
- ESLint 9 flat config: `eslint.config.mjs` — extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Run via `npm run lint` (`eslint`). No custom rules beyond next defaults; no style rules enforced (no semicolon rule, so both styles lint clean)
- `tsconfig.json`: `strict: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `target: ES2017`
- Path alias `@/*` maps to `./*` (project root)

## Import Organization

- `@/components/ui/...` — shadcn primitives
- `@/components/...` — feature components
- `@/lib/...` — server-side utilities
- `@/hooks/...` — React hooks
- Configured in `components.json` aliases and `tsconfig.json` `paths`

## Error Handling

- **API routes** (`app/api/**/route.ts`): try/catch around DB work; `console.error("Operation error:", error)` in catch; return `errorResponse("User-facing message", 500)` for generic failures. Named `export async function GET/POST/PUT/DELETE(request: NextRequest)`.
- **Response helpers** centralized in `lib/api-response.ts`: `successResponse(data, message?, status?)`, `errorResponse(msg, status?)`, `unauthorizedResponse()`, `forbiddenResponse()`, `notFoundResponse()`, `validationErrorResponse(errors)`. All responses use the shape `{ success: boolean, data?, error?, message? }`.
- **Auth guards**: every API route starts with `const user = await getCurrentUser(); if (!user) return unauthorizedResponse();` then role checks via `hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)` returning `forbiddenResponse(...)` (`app/api/users/route.ts`).
- **Server actions** (`lib/actions/bast-actions.ts`): `"use server"` directive; throw `new Error("Unauthorized")` for auth failure; return `{ success: true, data }` / `{ success: false, error: error.message }` objects; `revalidatePath()` after mutations.
- **Client components**: try/catch around `fetch`; `toast.success(...)` / `toast.error(...)` (sonner) for user feedback; `console.error("Failed to fetch X:", error)` in catch; `finally { setLoading(false) }`.
- **Validation**: manual inline checks in API routes (`if (!name || !tagNumber || !purchaseDate...) return errorResponse(..., 400)`) — no zod on the server. zod + react-hook-form only on client forms (`components/create-category-dialog.tsx`), and duplicate-field checks return 409 (`app/api/assets/route.ts`).
- `catch (error: any)` used pervasively (53 occurrences of `: any`/`as any` across `app/`, `components/`, `lib/`) to access `error.message`.

## Logging

- `console.error("X error:", error)` — all API route catch blocks and client fetch failures (`app/api/assets/route.ts`, `app/(authenticated)/assets/page.tsx`)
- `console.error("Create BAST Action Error:", error)` — server actions (`lib/actions/bast-actions.ts`)
- `console.log("Start seeding...")` — `prisma/seed.ts` and `scripts/*`
- `console.error` passed directly as `.catch(console.error)` in `components/qr-scanner-dialog.tsx`

## Comments

- JSDoc `/** ... */` block on every exported function in `lib/` and on route handlers, describing what it does: `/** GET /api/assets - Get all assets with filters */` (`app/api/assets/route.ts`), `/** Approve a BAST and update asset statuses */` (`lib/actions/bast-actions.ts`)
- Inline `//` comments for step labels: `// Build where clause`, `// Generate BAST Number`, `// Validation`, `// Check if tag number already exists`
- Mixed language: code identifiers and most inline comments are English, but some files carry Indonesian comments — `lib/auth.ts`, `proxy.ts`, `scripts/generate-hash.mjs` (e.g. `// Secret key untuk JWT`, `// Routes yang memerlukan authentication`)
- Used on exported lib functions (`lib/auth.ts`, `lib/api-response.ts`) — optional params noted in text, no `@param`/`@returns` tags

## Function Design

- Route handlers typically 60–170 lines each; page components 30–200 lines. No enforced limit.
- Small named helper functions inside components (`handleImageChange`, `handleSubmit`) rather than inline closures where reuse occurs
- Component props passed as a single destructured `Props` interface object: `export function CreateAssetDialog({ open, onOpenChange, onSuccess, categories }: CreateAssetDialogProps)`
- Server actions take a single typed input object: `createBast(input: CreateBastInput)` (`lib/actions/bast-actions.ts`)
- Status/role strings cast from Prisma enums at boundaries: `(role as UserRole) || UserRole.EMPLOYEE`
- API routes return `NextResponse<ApiResponse<T>>` via helpers
- Server actions return `{ success: boolean; data?: T; error?: string }`
- Auth lib functions return `Promise<JWTPayload | null>` (`verifyToken`, `getCurrentUser`)
- Components return JSX; pages `export default function` returning JSX

## Module Design

- Named exports everywhere for components and lib functions
- Default exports ONLY for Next.js pages/layouts: `export default function AssetsPage()`, `export default function RootLayout()` (`app/layout.tsx`)
- `lib/db.ts` exports both named (`export const db`) and `export default db`
- API routes export named handlers only: `export async function GET`, `POST`, etc.
- Not used. Imports are direct per-file: `import { Button } from "@/components/ui/button";` — no `components/ui/index.ts`
- Prisma enums/types imported directly from `@prisma/client`: `import { UserRole } from "@prisma/client"`

## Domain Conventions

- `"use client"` on components using hooks/state: dialogs, tables, pages with fetch (`components/create-asset-dialog.tsx`, `app/(authenticated)/assets/page.tsx`)
- Server components are async default exports: `export default async function AuthenticatedLayout({ children }: { children: React.ReactNode })` (`app/(authenticated)/layout.tsx`)
- `"use server"` on action modules (`lib/actions/bast-actions.ts`)
- Server actions (`lib/actions/`) coexist with REST API (`app/api/`); current client code prefers `fetch("/api/...")` + `{ success, data, error }` envelope over direct action imports
- After mutations via server actions: `revalidatePath("/bast")` (`lib/actions/bast-actions.ts`)
- Prisma access goes through the singleton `db` from `lib/db.ts`, never `new PrismaClient()` in route handlers
- Foreign-key lookups use `include`/`select` for shaping; list endpoints return `{ data, pagination: { page, limit, total, totalPages } }`
- shadcn/ui (new-york style, `components.json`) with Tailwind v4; `cn()` from `lib/utils.ts` for class merging; lucide-react icons on feature components, `@tabler/icons-react` in dashboard/data-table blocks; `sonner` toasts via `Toaster` in `app/layout.tsx`; `react-hook-form` + `zodResolver` for validated forms (`components/create-category-dialog.tsx`)

## Conventions Checklist for New Code

- Add `"use client"` as line 1 for any component using hooks/state
- Use `@/` alias for all internal imports; never relative imports in `components/` or `lib/`
- Hand-written files: double quotes, semicolons, trailing commas, 2-space indent (match `lib/` and `components/*.tsx`, not shadcn generated files)
- Add `/** ... */` JSDoc above every exported lib function and route handler
- Guard API routes with `getCurrentUser()` + `unauthorizedResponse()`, then `hasMinimumRole(...)` + `forbiddenResponse()` for admin routes
- Use response helpers from `lib/api-response.ts` — never build `NextResponse.json` inline (exception: `proxy.ts`)
- Wrap DB work in try/catch; log with `console.error("Context error:", error)`; return user-safe error messages
- Server components: `async` default export; client pages: `export default function XxxPage()`
- Prefer extracted props interfaces `<Name>Props`; type form state with `z.infer<typeof formSchema>`

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

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

- Client-side data fetching: `fetch("/api/...")` + `useState`/`useEffect` on every list/detail page — no React Query/SWR, no server-side data fetching on list pages
- Route handlers re-verify identity per request via `getCurrentUser()` (`lib/auth.ts:80-89`); the middleware-set `x-user-id`/`x-user-role` headers (`proxy.ts:49-54`) are never consumed by any route handler
- Per-route try/catch with `console.error` + structured error responses via `lib/api-response.ts`
- Server actions used only for BAST create (`components/create-bast-dialog.tsx:70`), approve/reject (`app/(authenticated)/bast/[id]/page.tsx:45,64`)
- Prisma `$transaction` for multi-step writes (BAST + BastDetail creation, BAST approve + asset status updates)
- Role-based navigation filtering is client-side only (`components/app-sidebar.tsx:91`); server-side role enforcement exists only in `app/api/users/route.ts` and `app/api/users/[id]/route.ts` via `hasMinimumRole`

## Layers

- Purpose: Render UI, hold client state, orchestrate data fetching
- Location: `app/`, `app/(authenticated)/`, `components/`
- Contains: Pages (`app/**/page.tsx`), feature components (`components/*-table.tsx`, `components/*-dialog.tsx`, `components/*-form.tsx`), UI primitives (`components/ui/*`)
- Depends on: REST routes (`/api/*`), server actions (`lib/actions/bast-actions.ts`), `lib/utils.ts`
- Used by: Browser
- Purpose: HTTP interface for CRUD + aggregations; JWT-gated
- Location: `app/api/**/route.ts` (23 route handlers)
- Contains: Route handlers exporting `GET`/`POST`/`PATCH`/`DELETE`
- Depends on: `lib/db.ts`, `lib/auth.ts`, `lib/api-response.ts`, Prisma enums
- Used by: Client pages and dialogs via `fetch()`
- Purpose: Direct server-side mutations for BAST lifecycle (used from dialogs/detail pages)
- Location: `lib/actions/bast-actions.ts`
- Depends on: `lib/db.ts`, `lib/auth.ts`, `next/cache` (`revalidatePath`)
- Used by: `components/create-bast-dialog.tsx`, `app/(authenticated)/bast/[id]/page.tsx`
- Purpose: Cross-cutting primitives — auth, DB client, response contract, utilities
- Location: `lib/`
- Contains: `lib/auth.ts`, `lib/db.ts`, `lib/api-response.ts`, `lib/utils.ts`
- Depends on: `@prisma/client`, `jose`, `bcryptjs`, `next/headers`, `next/server`, `clsx`, `tailwind-merge`
- Used by: Every route handler, server action, and server component
- Purpose: ORM client + schema definition
- Location: `lib/db.ts` (singleton), `prisma/schema.prisma` (schema), `prisma/seed.ts` (seed)
- Depends on: PostgreSQL via `DATABASE_URL` (pooled) + `DIRECT_URL` (`prisma/schema.prisma:6-9`)
- Used by: API layer, server actions, server components

## Data Flow

### Primary Request Path — List/Detail Pages (REST)

### Auth Entry Flow

### BAST Approve Flow — Server Action

### BAST Approve Flow — REST (parallel/duplicated implementation)

### Server-Rendered Flow — History Timeline

### Server-Rendered Flow — BAST Print

### File Upload Flow

- No global store (no Redux/Zustand/React Query). Each page owns `useState` + mount-time `fetch`; dialogs receive `onSuccess` callbacks to trigger refetch (e.g., `app/(authenticated)/assets/page.tsx:191-199`)
- Server cache invalidation only via `revalidatePath` in `lib/actions/bast-actions.ts`
- Auth state lives in the httpOnly cookie `auth-token`; user object passed into the shell from the server layout (`app/(authenticated)/layout.tsx:7`)

## Key Abstractions

- Purpose: Uniform JSON contract for all API responses
- Examples: `lib/api-response.ts` (`successResponse`, `errorResponse`, `unauthorizedResponse`, `forbiddenResponse`, `notFoundResponse`, `validationErrorResponse`)
- Pattern: `{ success: boolean, data?: T, error?: string, message?: string }` (`lib/api-response.ts:4-9`)
- Purpose: Signed user identity carried in the `auth-token` cookie
- Examples: `lib/auth.ts:12-18`, generated in `app/api/auth/login/route.ts:36-41`
- Pattern: `{ userId, email, role, fullName }` signed HS256 with 7d expiry (`lib/auth.ts:37-43`)
- Purpose: Prevents PrismaClient hot-reload exhaustion in dev
- Examples: `lib/db.ts:7-17`
- Pattern: `globalThis.prisma` cache, dev query logging
- Purpose: Numeric comparison for authorization
- Examples: `lib/auth.ts:109-122` (`ROLE_HIERARCHY`, `hasMinimumRole`)
- Pattern: SUPER_ADMIN(5) → ADMIN_INSTANSI(4) → STAFF_ASSET(3) → TEKNISI(2) → EMPLOYEE(1); enforced only in `app/api/users/route.ts:18,108` and `app/api/users/[id]/route.ts:21,73,94,135`
- Purpose: Reusable sortable/paginated/faceted table
- Examples: `components/data-table.tsx` (807 lines), consumed by `components/assets-table.tsx` etc.
- Pattern: `@tanstack/react-table` + `@dnd-kit` sorting + recharts sparkline + zod column schemas

## Entry Points

- Location: `app/page.tsx`
- Triggers: `GET /`
- Responsibilities: Public marketing hero + features (`components/landing-components.tsx`)
- Location: `app/login/page.tsx`
- Triggers: `GET /login` (public; middleware redirects here for unauthenticated users)
- Responsibilities: Renders `components/login-form.tsx`
- Location: `app/(authenticated)/layout.tsx`
- Triggers: All routes under `(authenticated)` group
- Responsibilities: `getCurrentUser`, renders `AppSidebar` + `SiteHeader` + children
- `app/(authenticated)/dashboard/page.tsx` — GET `/api/dashboard` aggregates (`app/api/dashboard/route.ts`)
- `app/(authenticated)/assets/page.tsx` + `app/(authenticated)/assets/[id]/page.tsx`
- `app/(authenticated)/bast/page.tsx` + `app/(authenticated)/bast/[id]/page.tsx`
- `app/(authenticated)/maintenance/page.tsx`
- `app/(authenticated)/categories/page.tsx`
- `app/(authenticated)/locations/page.tsx`
- `app/(authenticated)/users/page.tsx`
- `app/(authenticated)/reports/page.tsx`
- `app/(authenticated)/history/page.tsx` (server component)
- `auth/`: `login`, `register`, `logout`, `me`
- `assets/`, `assets/[id]`, `assets/[id]/images`, `assets/[id]/return`
- `bast/`, `bast/[id]`, `bast/[id]/approve`, `bast/[id]/reject`
- `maintenance/`, `maintenance/[id]`
- `categories/`, `categories/[id]`
- `locations/`, `locations/[id]`
- `divisions/`
- `users/`, `users/[id]`
- `dashboard/`, `reports/`
- Location: `app/bast/[id]/print/page.tsx`
- Triggers: `GET /bast/[id]/print` (outside authenticated group, self-guards)
- Location: `proxy.ts` (Next.js 16 middleware/proxy file)
- Triggers: Every request except `_next/static`, `_next/image`, `favicon.ico`, static assets
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

### Client-side-only role gating

### Pervasive `any` typing in handlers

### Runtime writes into `public/`

## Error Handling

- Helper responses: `successResponse`/`errorResponse`/`unauthorizedResponse`/`forbiddenResponse`/`notFoundResponse`/`validationErrorResponse` (`lib/api-response.ts`)
- Client reads `data.success` and toasts `data.error` (e.g., `app/(authenticated)/assets/page.tsx:105-110`)
- No `app/**/error.tsx`, `loading.tsx`, or `not-found.tsx` boundaries exist anywhere in `app/`

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
