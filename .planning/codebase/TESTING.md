# Testing Patterns

**Analysis Date:** 2026-08-10

## Test Framework

**Runner:**
- **Not installed.** No automated test framework exists in `package.json` — no `jest`, `vitest`, `playwright`, `cypress`, `@testing-library/*`, or `supertest` in dependencies or devDependencies.
- No test config files: `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*` — none detected.

**Assertion Library:**
- N/A — no assertion library installed.

**Run Commands:**
```bash
# There is no test script. The only quality-gate scripts in package.json are:
npm run lint    # eslint (flat config, next core-web-vitals + typescript)
npm run build   # next build (type-check via tsconfig strict mode)
```

## Test File Organization

**Location:**
- None. No `__tests__/` directories, no `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files exist anywhere in the repository (verified by full-tree glob).

**Naming:**
- N/A — no test files exist.

**Structure:**
- The only testing artifact is a manual QA checklist at the repo root: [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md), organized per feature (Assets, BAST, Dashboard, UI/UX) with checkbox steps, expected results, and a results-summary table.

## Test Structure

**Suite Organization:**
- No suites exist. If automated tests are introduced, the recommended placement (matching this codebase's structure) is:
  - Co-located: `<file>.test.ts(x)` next to source, or
  - `tests/` at repo root for API-route integration tests

**Patterns:**
- No `describe`/`it`/`test` blocks exist anywhere in the repository (grep for `test(`, `describe(`, `it(` across `*.{ts,tsx,mjs,js}` returns zero matches).

## Mocking

**Framework:**
- None installed. Natural mocking seams exist in the code:
  - Prisma: `lib/db.ts` exports a singleton `db` (PrismaClient), which is the single injection point for DB mocking (e.g. `vi.mock("@/lib/db")`)
  - Auth: `lib/auth.ts` (`getCurrentUser`, `verifyToken`, `hasMinimumRole`) is imported by every API route, so route tests can mock `@/lib/auth`
  - Response envelope: `lib/api-response.ts` centralizes responses, so assertion shapes are consistent (`{ success, data, error, message }`)

**What to Mock:**
- `@/lib/db` (Prisma singleton) — never hit a real database in unit tests
- `@/lib/auth` (`getCurrentUser`) — to exercise auth guards and role checks without cookies
- `next/headers` (`cookies()`) — used by `lib/auth.ts`
- Global `fetch` in client-component tests

**What NOT to Mock:**
- `lib/api-response.ts` helpers — assert against real `NextResponse` values
- Prisma enum values (`UserRole`, `AssetStatus`, `BastType` from `@prisma/client`) — import real enums for casts

## Fixtures and Factories

**Test Data:**
- The only existing fixture-like data is the seed script [prisma/seed.ts](prisma/seed.ts), which inserts deterministic IDs with a `cm6xx...` prefix (e.g. `cmp…usr01` admin `admin@eams.com`, assets `AST-IT-001` etc.) via raw SQL `INSERT`.
- Manual QA credentials documented in `TESTING_CHECKLIST.md`: `admin@eams.com` / `admin123`.

**Location:**
- No fixture files exist; seed data lives in `prisma/seed.ts` (run with `npx prisma db seed`, wired as `tsx prisma/seed.ts` in `package.json`).

## Coverage

**Requirements:** None enforced — no coverage tooling, no coverage thresholds, no CI gate.

**View Coverage:**
```bash
# Nothing available. A coverage tool must be added first (e.g. vitest --coverage).
```

## Test Types

**Unit Tests:**
- None. Highest-value candidates given the current code:
  - `lib/auth.ts` — `hashPassword`/`verifyPassword` (bcrypt round-trip), `generateToken`/`verifyToken` (jose round-trip, tampered token), `hasRole`, `hasMinimumRole`, `ROLE_HIERARCHY` ordering
  - `lib/api-response.ts` — status codes and envelope shape for all 6 helpers
  - `lib/utils.ts` — `cn()` class merging, `formatCurrency()` IDR formatting

**Integration Tests:**
- None. API route handlers in `app/api/**/route.ts` (e.g. `app/api/auth/login/route.ts`, `app/api/assets/route.ts`, `app/api/bast/[id]/approve/route.ts`) are the integration surface: test auth guard → validation → DB call → response envelope, mocking `@/lib/db` and `@/lib/auth`.

**E2E Tests:**
- Not used. The current E2E approach is fully manual via [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md): browser-driven walkthroughs of asset CRUD, BAST approve/reject flow, dashboard rendering, sidebar state, toast behavior, and responsive layout, with a `Test Results Summary` table and a report template.

## Common Patterns

**Async Testing:**
- No existing patterns. API handlers are `async` functions returning `NextResponse` — tests should `await` the handler with a mock `Request`/`NextRequest` and assert on `response.status` and `await response.json()`.

**Error Testing:**
- Recommended assertions based on existing error contracts:
  - Missing auth → `401` with `{ success: false, error: "Unauthorized" }` (`unauthorizedResponse` in `lib/api-response.ts`)
  - Insufficient role → `403` via `hasMinimumRole` guard (`app/api/users/route.ts`)
  - Duplicate unique field → `409` (`app/api/assets/route.ts` tag-number check)
  - Invalid body → `400` manual validation, or `422` with field errors (`validationErrorResponse`)
  - Generic DB failure → `500` with generic message (catch block never leaks `error.message`)

## Notes for Introducing Automated Tests

- `package.json` has no `test` script; one must be added along with a framework (vitest is the lightest fit for this Next.js 16 / React 19 / TypeScript setup; add `@vitejs/plugin-react` for component tests and `jsdom`/`happy-dom` environment for hooks/components).
- `tsconfig.json` (`strict: true`, `moduleResolution: "bundler"`, alias `@/*`) is compatible with vitest config via `resolve.alias`.
- Heavy reliance on `any` types in client state (`useState<any[]>`) and `catch (error: any)` will make strict typing of tests harder; consider typing API payloads before writing extensive component tests.
- The `{ success, data, error, message }` envelope from `lib/api-response.ts` gives a single, stable assertion contract across all endpoints.

---

*Testing analysis: 2026-08-10*