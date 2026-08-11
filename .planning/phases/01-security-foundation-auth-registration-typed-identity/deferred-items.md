# Deferred Items — Phase 01

Items discovered during execution that are OUT OF SCOPE for the current plan (scope-boundary rule).
Do not fix in-plan; carry forward to a later plan/phase.

## 1. Repo-wide `npm run lint` baseline failure (pre-existing)

- **Found during:** Plan 01-01 Task 2 verification (2026-08-11)
- **Issue:** `npm run lint` exits 1 with **159 problems (100 errors, 59 warnings)** across ~50 files.
  All are pre-existing issues in files untouched by plan 01-01: `@typescript-eslint/no-explicit-any`
  (dominant), `react-hooks/*` rules (set-state-in-effect, immutability, purity, incompatible-library,
  exhaustivedeps), `prefer-const`, `@typescript-eslint/ban-ts-comment`, `@next/next/no-img-element`,
  `react/no-unescaped-entities`. See `01-01-SUMMARY.md` → Issues Encountered for details.
- **Verification:** `npx eslint proxy.ts "app/(authenticated)/layout.tsx" lib/env.ts` → exit 0
  (the plan's own files are clean). None of the error files appear in the plan's `files_modified` list.
- **Impact:** The plan's `npm run lint exits 0` verification cannot pass repo-wide today; the gate
  passes for plan-touched files. Do not let the baseline block security work.
- **Suggested follow-up:** A dedicated cleanup plan (or `--fix` pass) for the ~100 `no-explicit-any`
  errors; AGENTS.md explicitly forbids *adding* new `any` — existing ones are grandfathered.

## 2. `npx prisma generate` EPERM when a dev server is running (Windows file lock)

- **Found during:** Plan 01-01 post-verification re-run (2026-08-11)
- **Issue:** Re-running `npx prisma generate` while a `next dev` server is live fails with
  `EPERM: operation not permitted, rename ...query_engine-windows.dll.node.tmpXXXX -> ...query_engine-windows.dll.node`
  because the running server (PID 6952/11088/13300, `npm run dev`) holds the DLL.
- **Impact:** None for plan 01-01 — the client was regenerated successfully during Task 1
  (orchestrator-verified) and `next build` + the running dev server prove the client is functional.
- **Suggested follow-up:** Stop `next dev` before future `prisma generate` runs on Windows, or
  document the lock as known-good behavior.

## 3. Pre-existing lint errors in plan-01-02 touched files (approve/return routes)

- **Found during:** Plan 01-02 Task 3 verification (2026-08-11)
- **Issue:** `npx eslint "app/api/bast/[id]/approve/route.ts" "app/api/assets/[id]/return/route.ts"`
  exits 1 with **3 errors + 1 warning, all pre-existing** (not introduced by this plan's 2-line
  changes):
  - `approve/route.ts:39` `@typescript-eslint/no-explicit-any` — `const updateData: any = {}`
  - `approve/route.ts:86` `@typescript-eslint/no-explicit-any` — `catch (error: any)`
  - `return/route.ts:65` `@typescript-eslint/no-explicit-any` — `catch (error: any)`
  - `approve/route.ts:1` `@typescript-eslint/no-unused-vars` warning — unused `NextResponse` import
- **Why not fixed:** Plan 01-02 explicitly forbids touching the catch blocks (`error.message` leak
  is Phase 2 SEC-09 scope: "Do NOT touch the catch block — the internal error.message leak there is
  Phase 2 scope"). The unused-import and updateData `any` are pre-existing baseline debt
  (scope-boundary rule: only fix issues directly caused by the current task's changes).
- **Impact:** The plan's `npm run lint exits 0` gate passes only for the other 5 touched files;
  these two files retain baseline errors. No functional/security impact.
- **Suggested follow-up:** Phase 2 (SEC-09) rewrites the catch blocks anyway; fold the
  `updateData: any` and `NextResponse` import cleanups into that same plan.
