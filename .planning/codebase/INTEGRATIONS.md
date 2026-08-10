# External Integrations

**Analysis Date:** 2026-08-10

## APIs & External Services

**Third-party SDKs/APIs:**
- None detected. No external SDK packages (`stripe`, `@supabase`, AWS, SendGrid, Google Cloud, OpenAI, etc.) are imported anywhere, and there are no `fetch()` calls to external URLs in `app/`, `lib/`, or `components/`. The application is entirely self-contained: browser → Next.js server → PostgreSQL.

**Google Fonts:**
- `next/font/google` loads the Geist and Geist_Mono font families at build time in `app/layout.tsx`. This is a build-time network dependency on Google's font files (self-hosted at build; no runtime CDN calls).

## Data Storage

**Databases:**
- PostgreSQL (via Prisma ORM, `provider = "postgresql"` in `prisma/schema.prisma`)
  - Connection: `DATABASE_URL` env var (Prisma `url` — pooled connection) and `DIRECT_URL` env var (`directUrl` — direct connection for migrations and introspection)
  - Client: Prisma Client 6.19.0, singleton in `lib/db.ts`
  - Schema: 9 models — `User`, `Division`, `Location`, `Category`, `Asset`, `Bast`, `BastDetail`, `Maintenance`, `AuditLog` — plus 3 enums (`UserRole`, `AssetStatus`, `AssetCondition`, `BastType`) in `prisma/schema.prisma`
  - The split pooled/direct URL pattern is characteristic of a hosted Postgres provider such as Supabase (per `BACKEND_README.md`); no direct SDK or client for any provider is used in code — all access goes through Prisma

**File Storage:**
- Local filesystem only. Asset images are uploaded to `public/uploads/assets/` via multipart form data (`app/api/assets/[id]/images/route.ts`) and stored as public URL paths like `/uploads/assets/<id>-<timestamp>-<filename>` in `Asset.imagePath`. No cloud storage (S3, Supabase Storage, etc.) is used.

**Caching:**
- None. No Redis, Memcached, or in-memory cache layer; no ISR/revalidate configuration in `next.config.ts`.

## Authentication & Identity

**Auth Provider:**
- Custom, no third-party provider (no NextAuth/Auth.js, Clerk, Supabase Auth, etc.)
  - Implementation: JWT-based, `lib/auth.ts`
  - Mechanism: `jose` (HS256) tokens with 7-day expiry, signed with `JWT_SECRET` env var; delivered via HTTP-only cookie `auth-token` (secure in production, `sameSite: lax`)
  - Passwords: `bcryptjs` with 12 salt rounds (`hashPassword` / `verifyPassword` in `lib/auth.ts`)
  - Route protection: `proxy.ts` (root-level proxy, Next.js edge middleware mechanism) matches `protectedRoutes` (`/dashboard`, `/api/assets`, `/api/users`, `/api/bast`, `/api/maintenance`, `/api/categories`, `/api/divisions`, `/api/locations`), verifies the token, and injects `x-user-id` / `x-user-role` headers into API requests
  - RBAC: role hierarchy (`SUPER_ADMIN` → `EMPLOYEE`) defined as `ROLE_HIERARCHY` in `lib/auth.ts`, enforced via `hasMinimumRole()`

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry, LogRocket, or similar integration.

**Logs:**
- Console only (`console.error` in API route catch blocks, e.g., `app/api/assets/[id]/images/route.ts`) plus Prisma query logging in development (`lib/db.ts`).

## CI/CD & Deployment

**Hosting:**
- Not configured. No Dockerfile, `docker-compose.yml`, `vercel.json`, or hosting platform config detected. `README.md` contains the default `create-next-app` reference to the Vercel platform only.

**CI Pipeline:**
- None. No `.github/workflows/` directory or other CI config.

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` — PostgreSQL pooled connection string (required by `prisma/schema.prisma`)
- `DIRECT_URL` — PostgreSQL direct connection string (required by `prisma/schema.prisma`; used for migrations)
- `JWT_SECRET` — JWT signing secret. IMPORTANT: `lib/auth.ts:8` falls back to a hardcoded `"your-secret-key-change-this-in-production"` when unset, so production deployments must set this explicitly
- `NODE_ENV` — set automatically by Next.js; controls secure cookie flag and Prisma log level

**Secrets location:**
- `.env` file (root) — gitignored via `.env*` in `.gitignore`; no `.env.example` is committed, so new environments must be configured from the var names above

## Webhooks & Callbacks

**Incoming:**
- None. No webhook or external callback endpoints.

**Outgoing:**
- None. No outbound webhooks or notifications (no email/SMS integration).

## Internal API Surface (self-integrated)

The app exposes its own REST API under `app/api/` consumed by the same Next.js app's client components (no external consumers):

- `app/api/auth/login|register|logout|me/route.ts` — authentication
- `app/api/assets/route.ts`, `app/api/assets/[id]/route.ts`, `app/api/assets/[id]/return/route.ts`, `app/api/assets/[id]/images/route.ts` — asset CRUD, return workflow, image upload
- `app/api/bast/route.ts`, `app/api/bast/[id]/route.ts`, `app/api/bast/[id]/approve/route.ts`, `app/api/bast/[id]/reject/route.ts` — BAST (handover document) workflow
- `app/api/categories/route.ts` (+ `[id]`), `app/api/divisions/route.ts`, `app/api/locations/route.ts` (+ `[id]`) — master data
- `app/api/maintenance/route.ts` (+ `[id]`) — maintenance tracking
- `app/api/users/route.ts` (+ `[id]`) — user management (admin)
- `app/api/dashboard/route.ts`, `app/api/reports/route.ts` — statistics/aggregations

---

*Integration audit: 2026-08-10*