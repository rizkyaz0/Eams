# Technology Stack

**Analysis Date:** 2026-08-10

## Languages

**Primary:**
- TypeScript ^5 (strict mode, target ES2017) - Entire application, full-stack (server components, API routes, client components). See `tsconfig.json`, which sets `strict: true`, `moduleResolution: "bundler"`, and the `@/*` path alias mapping to `./*`.

**Secondary:**
- SQL (PostgreSQL dialect) - Seed data via raw SQL in `prisma/seed.ts` and `seed.sql`
- CSS - Tailwind CSS v4 directives in `app/globals.css`
- HTML/TSX - React components in `app/` and `components/`

## Runtime

**Environment:**
- Node.js (no `.nvmrc` or `engines` field specified; Next.js 16 requires Node 18.18+)
- Package name: `antigravity` v0.1.0 (private) per `package.json`

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (committed, should be used for reproducible installs)

## Frameworks

**Core:**
- Next.js 16.3.0 (installed; `package.json` declares `^16.3.0`) - App Router fullstack framework; server-rendered pages, React Server Components, and API route handlers
- React 19.2.3 (with React DOM 19.2.3) - UI library
- Tailwind CSS 4.1.18 - CSS framework via `@tailwindcss/postcss` plugin configured in `postcss.config.mjs` (no `tailwind.config` file — v4 CSS-first config)
- shadcn/ui 3.8.4 - Component system; `components.json` uses "new-york" style, `rsc: true`, baseColor "slate", icon library "lucide"; generated components live in `components/ui/`
- Prisma ORM 6.19.3 (CLI) / `@prisma/client` 6.19.0 - Database access; schema at `prisma/schema.prisma`

**Testing:**
- Not detected - no test framework, no test files, no jest/vitest config, and no test scripts in `package.json`

**Build/Dev:**
- TypeScript ^5 - Type checking (via Next.js build)
- ESLint 9 - Flat config `eslint.config.mjs` (extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`); command: `npm run lint`
- tsx ^4.21.0 - Runs TypeScript scripts directly (`prisma/seed.ts`, `scripts/fix-login.ts`, `scripts/reset-admin-password.ts`); also the Prisma seed runner per the `prisma.seed` field in `package.json`
- shadcn CLI - Component scaffolding (`components.json`)
- tw-animate-css ^1.4.0 - Animation utilities for Tailwind v4

## Key Dependencies

**Critical:**
- `next` ^16.3.0 - Application framework and server
- `@prisma/client` 6.19.0 - Type-safe database client; singleton exported from `lib/db.ts` (uses `globalThis` caching to avoid duplicate clients in dev)
- `jose` ^6.1.3 - JWT signing/verification (HS256, 7-day expiry); used in `lib/auth.ts`
- `bcryptjs` ^3.0.3 - Password hashing (bcrypt, 12 rounds); used in `lib/auth.ts`
- `zod` ^4.3.6 - Schema validation for forms and API input validation
- `react-hook-form` ^7.71.1 + `@hookform/resolvers` ^5.2.2 - Form state management with zod integration
- `dotenv` ^17.2.4 - Environment loading in scripts

**UI/Interaction:**
- `radix-ui` ^1.4.3 - Headless UI primitives (bundled shadcn/ui dependency)
- `lucide-react` ^0.563.0 - Primary icon set (shadcn icon library)
- `@tabler/icons-react` ^3.36.1 - Secondary icon set
- `class-variance-authority` ^0.7.1 + `clsx` ^2.1.1 + `tailwind-merge` ^3.4.0 - Class composition; combined in `cn()` helper at `lib/utils.ts`
- `framer-motion` ^12.34.3 - Animations (`components/theme-transition.tsx`)
- `sonner` ^2.0.7 - Toast notifications, mounted via `<Toaster />` in `app/layout.tsx`
- `vaul` ^1.1.2 - Drawer component
- `next-themes` ^0.4.6 - Dark/light theme (`components/theme-provider.tsx`)

**Data Display:**
- `@tanstack/react-table` ^8.21.3 - Table data grid
- `recharts` ^2.15.4 - Charts for dashboard/reports
- `date-fns` ^4.1.0 - Date formatting

**Drag & Drop / Input:**
- `@dnd-kit/core` ^6.3.1, `@dnd-kit/modifiers` ^9.0.0, `@dnd-kit/sortable` ^10.0.0, `@dnd-kit/utilities` ^3.2.2 - Sortable lists
- `html5-qrcode` ^2.3.8 - QR code scanning (asset identification)

## Configuration

**Environment:**
- Environment variables are loaded from `.env` (file itself is gitignored via `.env*` in `.gitignore`; no `.env.example` committed)
- `process.env` usage is concentrated in two files:
  - `prisma/schema.prisma` - `DATABASE_URL` (required, pooled connection) and `DIRECT_URL` (direct connection) for the Postgres datasource
  - `lib/auth.ts` - `JWT_SECRET` (NOTE: falls back to hardcoded `"your-secret-key-change-this-in-production"` if unset) and `NODE_ENV` (controls `secure` cookie flag)
- `lib/db.ts` - `NODE_ENV` controls Prisma log level (query/error/warn in dev, error only in production)

**Build:**
- `next.config.ts` - Empty default config (no custom settings)
- `tsconfig.json` - Strict TS config; `@/*` → `./*` path alias; includes `.next/types/**/*.ts`
- `postcss.config.mjs` - `@tailwindcss/postcss` plugin only
- `eslint.config.mjs` - Flat config with Next.js core-web-vitals + TypeScript rulesets
- `components.json` - shadcn/ui registry config

## Platform Requirements

**Development:**
- Node.js runtime with npm
- PostgreSQL database reachable at `DATABASE_URL` (and `DIRECT_URL` for direct connections)
- `JWT_SECRET` set in `.env` for authentication
- Run with `npm run dev` (Next.js dev server on port 3000, per `package.json`)

**Production:**
- Deploy target not explicitly configured (no `vercel.json`, Dockerfile, CI workflow, or hosting config detected; README references Vercel as the default `create-next-app` deployment path)
- `npm run build` then `npm start` for self-hosting
- Note: uploaded asset images are written to `public/uploads/assets/` on the local filesystem (`app/api/assets/[id]/images/route.ts`) — a persistent volume/filesystem is required in any deployment

---

*Stack analysis: 2026-08-10*