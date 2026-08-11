---
phase: "04"
name: "secure-uploads"
created: 2026-08-11
status: passed
---

# Phase 04: secure-uploads - Verification

## Goal-Backward Verification

**Phase Goal:** Asset image uploads are validated by magic bytes with a jpeg|png|webp allowlist (SVG rejected), capped at 5 MB, stored outside `public/` under server-generated names, and served only through an authenticated route with path-traversal guards and validated headers. Closes the stored-XSS and disk-fill vectors.

## Checks

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| SEC-10 | Magic-byte validation; jpeg/png/webp allowlist; SVG rejected | PASS | `lib/file-validation.ts` `detectImageType()`; live test: jpeg/png/webp magic → detected, SVG text → null, empty → null. Commit `62e4691`, `a28a90f` |
| SEC-11 | 5 MB cap → 413; upload gated STAFF_ASSET min | PASS | Content-Length pre-check + `file.size` cap → 413; `requireRole(UserRole.STAFF_ASSET)` (Phase 2) retained; live test: anonymous → 401, employee → 403, >5MB → 413. Commit `a28a90f` |
| SEC-12 | Storage outside `public/`, server-generated random names | PASS | Writes `join(process.cwd(), "uploads", "assets")` with `${randomUUID()}.${ext}`; DB `imagePath` = `uploads/assets/<uuid>.<ext>`; live test: static `/uploads/assets/<name>` → 404. Commit `a28a90f` |
| SEC-13 | Authenticated serve route; traversal guard; validated headers; nosniff | PASS | `app/api/assets/images/[name]/route.ts` — `requireUser()`, `NAME_PATTERN` UUID+ext regex, `resolve`+`startsWith` guard, Content-Type from allowlisted ext, inline Content-Disposition, `X-Content-Type-Options: nosniff`; live test: serve 200 + nosniff + image/jpeg, traversal `..%2F..%2F.env` → 404. Commit `4800135` |
| TEST-05 | Upload security test | PASS | `npm run verify:upload-security` exit 0 — Part A (validator) 6/6 PASS; Part B (live) 401/403/400/413/201/200/nosniff/404-static/404-traversal PASS. Commit `1e83303` |

## Build / Type / Lint Gates

- `npx tsc --noEmit` — PASS (exit 0)
- `npm run build` — PASS (Next.js 16.3.0 Turbopack; 28/28 pages; Proxy middleware)
- `npx eslint` on phase-touched files — PASS (exit 0; repo-wide baseline failure pre-existing, out of scope)

## Result

**Verdict: PASSED**

Success criteria 1–4 verified end-to-end:
1. SVG / non-allowlisted types rejected; JPEG/PNG/WebP with valid magic bytes accepted (validator unit + live 400 on SVG).
2. >5 MB → 413; anonymous → 401; below STAFF_ASSET → 403 (live).
3. Files stored outside `public/` — static URL 404; served only via authenticated route (live).
4. Path-traversal blocked; validated Content-Type/Content-Disposition with nosniff (live header check).

Deviations: TEST-05 delivered as a DB-backed standalone script (no vitest — developer decision); `file-type` dependency skipped for hand-rolled magic bytes (plan decision).

Remaining risks:
- Legacy `public/uploads/assets/` files + old DB rows remain statically served (grandfathered, no migration).
- `request.formData()` buffers whole body — mitigated by Content-Length pre-check.
- Executor session errored at dev-server step; all gates re-verified directly by orchestrator — no work lost, tree clean.
