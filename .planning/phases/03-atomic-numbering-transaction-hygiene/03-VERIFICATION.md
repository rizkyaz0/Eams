---
phase: "03"
name: "atomic-numbering-transaction-hygiene"
created: 2026-08-11
status: passed
---

# Phase 03: atomic-numbering-transaction-hygiene - Verification

## Goal-Backward Verification

**Phase Goal:** BAST numbers are generated atomically inside the create transaction (counter row + `SELECT ... FOR UPDATE` via `$queryRaw`), with the unique index as backstop, and the destructive raw-SQL seed is replaced by an idempotent upsert-based seed. Runs directly on Phase 2's service layer so there is exactly one numbering call site.

## Checks

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| BUG-03 | Atomic BAST number in create tx (counter row + SELECT FOR UPDATE via $queryRaw); unique index backstop | PASS | `lib/services/bast-service.ts`: `bastNumberCounter.upsert` + `SELECT "lastNumber" ... FOR UPDATE` inside `db.$transaction`; format `BAST/YYYY/MM/NNNN` from locked counter; `bastNumber String @unique` (schema:88) retained as backstop. Commit `f048ba9` + `cb475e0` |
| DATA-01 | Idempotent upsert seed — no `TRUNCATE ... CASCADE` | PASS | `prisma/seed.ts` rewritten to per-model `upsert` on fixed IDs; grep `TRUNCATE` in seed.ts = 0; run twice → both exit 0, counts identical `{"user":3,"asset":6,"division":3,"category":4,"location":3,"bast":1,"bastDetail":1,"maintenance":1}` (asset=6 proves non-destructive — a non-seed asset survived). Commit `f7a8aa4` |
| TEST-06 | Concurrency test — 12 parallel creates → 12 unique, zero failures | PASS | `npm run verify:bast-concurrency` exit 0 twice: `PASS: 12 unique BAST numbers, 0 failures` (BAST/2026/08/0001–0012, out-of-order completion); counter restored post-test; 0 P40xx deadlocks (R2 fallback not needed). Commit `009dd3a` |

## Build / Type / Lint Gates

- `npm run build` — PASS (Next.js 16.3.0, Turbopack, 28/28 pages)
- `npx tsc --noEmit` — PASS (exit 0)
- `npx eslint` on touched files — PASS (repo-wide baseline failure pre-existing, out of scope)
- `npx prisma db push` (additive) + `generate` + `validate` — PASS

## Result

**Verdict: PASSED**

Success criteria 1–3 verified:
1. 12 parallel creates → 12 unique numbers, zero failures — row-lock serialization proven live (test run twice).
2. Seed re-runnable without destroying data — no TRUNCATE; second run leaves counts identical; non-seed rows preserved.
3. Concurrency test passes as an automatable script (`npm run verify:bast-concurrency`, exit 0).

Deviation: TEST-06 delivered as a DB-backed standalone script instead of a Vitest case (developer rejected vitest infra in Phase 1) — CI-able via the npm script; documented in 03-SUMMARY.md.

Remaining risks:
- Concurrency test needs live PG + seed data (not unit-isolated).
- Counter drift could still hit the unique backstop (results in a 500, never a duplicate).
- Grandfathered seed BAST `BAST/2024/001` predates the new format (cosmetic).
- Dev server on port 3000 was stopped to unblock `prisma generate` (EPERM) — restart `npm run dev` when needed.
