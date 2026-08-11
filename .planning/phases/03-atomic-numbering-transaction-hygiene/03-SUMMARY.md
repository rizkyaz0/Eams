---
phase: "03"
name: "atomic-numbering-transaction-hygiene"
mode: mvp
status: complete
---

# Phase 03: Atomic Numbering & Transaction Hygiene — SUMMARY

BAST numbers are now generated atomically inside the create transaction via a
`BastNumberCounter` row + `SELECT ... FOR UPDATE` (BUG-03), the destructive raw-SQL
seed was replaced by an idempotent upsert-based seed (DATA-01), and a standalone
DB-backed concurrency test proves 12 parallel creates yield 12 unique numbers with
zero failures (TEST-06). Verified end-to-end: build + tsc + lint-on-touched +
concurrency test + seed idempotency + grep gates, all passing.

## Completed Tasks & Commits

| Task | Commit | Scope |
|---|---|---|
| 1 — BastNumberCounter model + db push + generate | `cb475e0` | `prisma/schema.prisma` — new `BastNumberCounter` model (`period @unique`, `lastNumber Int @default(0)`); `prisma db push` (additive, no data loss) + `prisma generate` + `prisma validate` all exit 0 |
| 2 — Atomic BAST numbering (BUG-03) | `f048ba9` | `lib/services/bast-service.ts` — removed racy `bast.count()` outside the tx; inside `db.$transaction`: `bastNumberCounter.upsert` (idempotent row ensure) → `$queryRaw` `SELECT "lastNumber" ... FOR UPDATE` (row lock serializes concurrent creates) → increment → `BAST/YYYY/MM/NNNN`; JSDoc lock/backstop note; unique index kept as backstop |
| 3 — Idempotent upsert seed (DATA-01) | `f7a8aa4` | `prisma/seed.ts` — full rewrite: TRUNCATE + raw `$executeRawUnsafe` INSERTs replaced with `upsert` calls keyed on fixed ids for division×3, user×3, category×4, location×3, asset×5 (holderId folded into ast02), bast×1, bastDetail×1 (`bastId_assetId` composite), maintenance×1; all data values preserved |
| 4 — Concurrency test (TEST-06) | `009dd3a` | `scripts/concurrency-bast-test.mjs` + `package.json` `verify:bast-concurrency` script — 12 parallel `createBastService` calls, asserts zero rejects / 12 unique numbers / format regex; finally-cleanup deletes created BASTs and restores the counter row |

## Verification Results

All gates below pass with exact output:

- **`npm run build`** — exit 0 (Next.js 16.3.0 Turbopack; compiled 7.8s, TS 10.9s, 28/28 pages)
- **`npx tsc --noEmit`** — exit 0
- **`npx eslint lib/services/bast-service.ts scripts/concurrency-bast-test.mjs`** — exit 0 (touched files only; repo-wide baseline `no-explicit-any` failure pre-existing / out of scope)
- **`npm run verify:bast-concurrency`** — exit 0 (ran twice):
  ```
  PASS: 12 unique BAST numbers, 0 failures
  Numbers: BAST/2026/08/0001, BAST/2026/08/0006, BAST/2026/08/0004, BAST/2026/08/0010, ... (all 0001–0012, out-of-order completion as expected under concurrency)
  ```
- **Seed idempotency** — `npx tsx prisma/seed.ts` run twice; both exit 0; counts identical after run 1 and run 2:
  `{"user":3,"asset":6,"division":3,"category":4,"location":3,"bast":1,"bastDetail":1,"maintenance":1}`
  (asset = 6 because one non-seed asset exists in the DB — preserved across runs, proving non-destructiveness; no growth, no wipe)
- **grep gates**:
  - `TRUNCATE` in `prisma/seed.ts` — **0 matches**
  - `FOR UPDATE` in `lib/services/bast-service.ts` — 2 matches (lock statement + JSDoc)
  - `bastNumberCounter` in `lib/services/bast-service.ts` — 4 matches (upsert + update + 2 comments)
  - `bastNumber String @unique` in `prisma/schema.prisma` — found (line 88, backstop intact)
- **`npx prisma validate`** — exit 0; generated client exposes `bastNumberCounter` and `BastDetail.bastId_assetId` compound key (R4 confirmed)

## Deviations

1. **[Rule 2 - gate compliance] Seed header comment reworded (Task 3).** The first draft's header comment literally mentioned the removed `TRUNCATE` statement; the plan's grep gate requires 0 matches of `TRUNCATE` in `prisma/seed.ts`, so the comment now reads "destructive raw-SQL table-reset approach". No behavior change; seed re-verified exit 0 after the reword.
2. **[Rule 2 - import mechanics] CJS/ESM interop in the concurrency script (Task 4).** tsx transpiles the TS service to CJS, so the ESM `.mjs` could not resolve `import { createBastService }` (and namespace import exposed only `default`/`module.exports`). Switched to default import (`import bastService from "../lib/services/bast-service.ts"` → `bastService.createBastService`). File stays `.mjs` and the npm script is exactly as planned (R5 latitude on import mechanics).
3. **[Rule 2 - robustness] Cleanup hardened in the concurrency script (Task 4).** Used `Promise.allSettled` (not `Promise.all`) so partial failures still clean up created BASTs; and the counter row is **restored to its pre-test value** (or deleted if it did not exist) instead of an unconditional reset-to-0 — an unconditional 0-reset would collide with real BAST numbers already issued in the current period. Pre-test state here was "no counter row"; cleanup verified (`bast` back to 1, counter rows `[]`).
4. **[R2 fallback — NOT taken]** The canonical upsert + `SELECT ... FOR UPDATE` pattern passed the 12-way concurrency test with **zero P40xx deadlocks** on both runs. The raw `INSERT ... ON CONFLICT ... RETURNING` fallback was not needed and was not applied.

## Environmental Notes

- `prisma generate` initially failed with EPERM (dev server held `query_engine-windows.dll.node`). Killed the node process listening on port 3000 (PID 24984) and retried — generate succeeded. **The dev server on port 3000 is no longer running; restart `npm run dev` if needed.**

## Deferred Items

None. TEST-06 and DATA-01 are fully implemented and verified in-plan; no items were deferred to `deferred-items.md`.

## Remaining Risks

- The concurrency test is a standalone DB-backed script (no vitest, per developer decision): it requires a live local PostgreSQL and seed data (`admin@eams.com` + ≥1 asset). CI-able but DB-dependent.
- The `BastNumberCounter` row is the numbering source of truth; a schema/counter drift (manual DB edits, restoring a pre-phase dump) could still produce a collision — the `bastNumber @unique` backstop then surfaces a 500 rather than a duplicate.
- One row per monthly period accumulates in `BastNumberCounter` (negligible; no cleanup job).
- The historical seed BAST `BAST/2024/001` does not match the current `BAST/YYYY/MM/NNNN` format — grandfathered data, intentionally preserved by the idempotent seed.
