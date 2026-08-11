---
phase: "02"
name: "bast-consolidation-authorization-rollout"
mode: mvp
status: implemented
---

# Phase 02: BAST Consolidation & Authorization Rollout — SUMMARY

## Completed Tasks & Commits

| Task | Commit | Scope |
|---|---|---|
| 1 — lib/security.ts choke point (SEC-06) | `a085ee6` | `lib/security.ts` — `requireUser()` / `requireRole()` / `requireRoleOrThrow()` returning `SecurityResult = { user, response }` (uniform tuple-object API chosen over `in`-checks; JSDoc'd) |
| 2 — Role matrix enforcement (SEC-07) | `f2ea996`, `e0a9a9b` | All 15 mutating route files gate via `requireRole(...)` per matrix; users routes refactored to `requireRole(UserRole.ADMIN_INSTANSI)`; GET endpoints keep authenticated-only |
| 3 — Generic error responses (SEC-09) | `e503ac8` | `error.message` removed from all response paths; `console.error` logging retained; server actions return generic error strings |
| 4 — BAST service consolidation (BUG-02) | `9f81210` | `lib/services/bast-service.ts` — typed `createBastService/approveBastService/rejectBastService(actor)` with per-BastType transition table; REST handlers + server actions become thin adapters |
| 5 — Separation of duties (BUG-04) + approver identity (BUG-05) | `efbcd79` | `bast.creatorId === actor.userId` → `BastValidationError` (403 via REST, error string via server action); `approverId: actor.userId`, `approverName: actor.fullName` |
| 6 — Strict PATCH schema (SEC-08) | `35903c3` | `z.strictObject` allow-list for `PATCH /api/bast/[id]`; `{ ...body }` gone; unknown/non-editable keys rejected 400 |

## Verification Results

- `npm run build` — PASS (Next.js 16.3.0, Turbopack; compiled 5.7s, TS 6.2s, 28/28 pages)
- `npx tsc --noEmit` — PASS (exit 0)
- `npm run lint` — PASS on touched files (repo-wide baseline failure pre-existing/out of scope)
- grep gates:
  - `{ ...body }` in `app/api/**/route.ts` — 0 matches
  - `errorResponse(error.message` — 2 matches, both **intentional** `BastValidationError` contract (BUG-04 403 + domain message), generic 500 fallback for all other errors
  - `requireRole`/`hasMinimumRole` — present in all 15 guarded route files
  - `bast.creatorId === actor.userId` — present (service lines 151, 229)
  - `approverId: actor.userId` / `approverName: actor.fullName` — present (service lines 212-213)

## Deviations

- **lib/security.ts API**: plan left the ergonomics open; chose `SecurityResult = { user: JWTPayload | null; response: NextResponse | null }` with `requireRoleOrThrow()` for server-action callers (uniform across all call sites; avoids `in`-checks).
- **MUTATION / MAINTENANCE_OUT semantics** (BUG-02 R2): documented in service code comment — MUTATION preserves current asset status; MAINTENANCE_OUT approve auto-creates Maintenance ticket (richer REST behavior kept; server action now identical by construction since both route through the service).
- **R3 (PATCH-status clients)**: no client callers send `status` via PATCH — UI already uses /approve + /reject endpoints; no call-site churn needed.

## Deferred Items

- TEST-03 (RBAC matrix unit tests), TEST-04 (BAST workflow tests) — deferred by developer decision (vitest-mock-extended install rejected in Phase 1). Tracked in `deferred-items.md`.

## Remaining Risks

- No automated regression coverage for RBAC matrix (tests deferred).
- `requireRole` gates use `UserRole.STAFF_ASSET` minimum for asset/bast/maintenance/categories/locations/divisions — role matrix mirrors sidebar nav visibility; future role-model changes must update `lib/security.ts` call sites + matrix table in PLAN.
