---
phase: "02"
name: "bast-consolidation-authorization-rollout"
created: 2026-08-11
status: passed
---

# Phase 02: bast-consolidation-authorization-rollout - Verification

## Goal-Backward Verification

**Phase Goal:** All BAST business logic lives in one typed service with legal transitions per BastType and separation of duties, and every mutating endpoint/server action enforces roles through a single `requireUser()`/`requireRole()` choke point with generic error responses. This phase kills the largest HIGH finding (missing role checks) and the behavioral divergence between REST and server-action BAST paths.

## Checks

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| SEC-06 | `requireUser()` (401) + `requireRole(min)` (403) in `lib/security.ts` | PASS | `lib/security.ts` exports `SecurityResult = { user, response }`, `requireUser()`, `requireRole()`, `requireRoleOrThrow()`; JSDoc'd; uniform call-site pattern `const { user, response } = await requireRole(...); if (response) return response;` |
| SEC-07 | All mutating endpoints gate via role matrix | PASS | Grep: `requireRole(`/`hasMinimumRole` present in all 15 guarded route files (assets ×4, bast ×5, maintenance ×2, categories, locations, divisions, users ×2). Commit `f2ea996`, `e0a9a9b` |
| SEC-08 | `PATCH /api/bast/[id]` strict allow-list, no raw body spread | PASS | `z.strictObject` schema (route.ts:14); repo-wide grep `{ ...body }` in `app/api/**/route.ts` = 0 matches. Commit `35903c3` |
| SEC-09 | Generic error responses — no internal `error.message` leak | PASS | `errorResponse(error.message, ...)` = 2 matches, both intentional `BastValidationError` domain contract (BUG-04 403 + domain message); all other errors → generic 500. Commit `e503ac8` |
| BUG-02 | BAST logic consolidated into `lib/services/bast-service.ts` | PASS | Service exports `createBastService/approveBastService/rejectBastService(actor)` with per-BastType transition table; REST routes + server actions are thin adapters (approve/reject routes now 27-line adapters). Commit `9f81210` |
| BUG-04 | Creator cannot approve/reject own BAST | PASS | `bast.creatorId === actor.userId` → `BastValidationError` (service lines 151, 229) → 403 REST / error-string server action. Commit `efbcd79` |
| BUG-05 | `approverId`/`approverName` from authenticated actor | PASS | `approverId: actor.userId`, `approverName: actor.fullName` (service lines 212-213). Commit `efbcd79` |
| TEST-03 | RBAC matrix unit tests | NOT MET (deferred) | Developer decision (vitest rejected Phase 1) — tracked in `deferred-items.md` |
| TEST-04 | BAST workflow unit tests | NOT MET (deferred) | Same — tracked in `deferred-items.md` |

## Build / Type Gates

- `npm run build` — PASS (Next.js 16.3.0 Turbopack; compiled 5.7s, TS 6.2s, 28/28 pages, Proxy middleware)
- `npx tsc --noEmit` — PASS (exit 0)
- `npm run lint` — PASS on phase-touched files (repo-wide baseline failure pre-existing, out of scope)

## Result

**Verdict: PASSED** (with documented deviations)

Success criteria 1–4 verified via build gates + tsc + grep gates (detailed in `02-SUMMARY.md`):
1. Every mutating endpoint/server action returns 401 anonymous / 403 below-role — `requireRole` present in all 15 files.
2. BAST create/approve/reject identical through one service; `approverId`/`approverName` from `user.userId`/`user.fullName`.
3. Creator self-approve/reject → 403 `BastValidationError` regardless of role.
4. PATCH accepts only allow-listed fields via `z.strictObject`; `status`/`bastNumber`/etc. rejected.
5. Error responses generic — internal messages never leak (only intentional domain contract).

Success criterion 5 (unit test suite) NOT met — deferred by developer decision (TEST-03/TEST-04).

Remaining risks:
- No automated RBAC/BAST regression coverage (tests deferred).
- Phase-02 executor session (gsd-1) errored mid-verification; all gates re-verified directly by orchestrator — no work lost, tree clean.
