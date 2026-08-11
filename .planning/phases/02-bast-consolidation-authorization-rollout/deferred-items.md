# Deferred Items — Phase 02

Items discovered during execution that are OUT OF SCOPE for the current plan (scope-boundary rule).
Do not fix in-plan; carry forward to a later plan/phase.

## 1. TEST-03 — Unit tests for the RBAC matrix (deferred by developer decision)

- **Found during:** Phase 02 planning (2026-08-11)
- **Issue:** SEC-07/SEC-06 enforce the role matrix via `lib/security.ts` (`requireRole`) across all
  15 mutating route files, but there is no automated regression coverage for the matrix.
- **Why not done:** Developer rejected the `vitest-mock-extended` install at Phase 1's blocking-human
  checkpoint; TEST-01/TEST-02 were deferred. TEST-03/TEST-04 inherit that decision — no test
  infrastructure exists in the repo.
- **Impact:** RBAC regressions would be caught only by manual smoke tests or build gates, not CI.
- **Suggested follow-up:** When the developer re-approves vitest infra, add `tests/security.test.ts`
  (anonymous → 401, below-role → 403, at-role → pass) and `tests/bast-service.test.ts`.

## 2. TEST-04 — BAST workflow tests (deferred by developer decision)

- **Found during:** Phase 02 planning (2026-08-11)
- **Issue:** The consolidated `lib/services/bast-service.ts` transition table (per-BastType asset
  status/holder/location changes, BUG-04 separation of duties) has no automated tests.
- **Why not done:** Same vitest decision as TEST-03.
- **Suggested follow-up:** Cover approve/reject transitions for ASSIGNMENT/PROCUREMENT/RETURN/
  MUTATION/MAINTENANCE_OUT/MAINTENANCE_IN/DISPOSAL, creator-self-approval → 403, and stale-token
  revocation interplay with tokenVersion.

## 3. `app/api/bast/[id]/route.ts` GET — approve/reject logic removed, R3 call-site audit

- **Found during:** Phase 02 Task 6 (SEC-08) verification
- **Issue:** PATCH no longer accepts `status`/approve-embedded transitions; audit confirmed no client
  sends `status` via PATCH (UI uses /approve + /reject endpoints), so no call-site churn was needed.
- **Impact:** None — resolved in-plan.
- **Suggested follow-up:** None (recorded for completeness).
