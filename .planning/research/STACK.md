# Stack Research

**Domain:** Enterprise Asset Management System (EAMS) — security hardening of an existing Next.js 16 + Prisma/PostgreSQL brownfield app
**Researched:** 2026-08-10
**Confidence:** HIGH (versions verified against npm registry 2026-08-10; patterns cross-checked against official docs and OWASP)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js (installed) | 16.3.x (have 16.3.0) | App Router framework; `proxy.ts` for request filtering | Next 16 renamed `middleware.ts` → `proxy.ts` (named export `proxy`, nodejs runtime, no edge) — the project already complies. Per Next 16 data-security guidance, page/route-layer checks do NOT extend to server actions: every action must re-verify auth and authorization itself. `proxy.ts` stays defense-in-depth, never the enforcement gate. |
| jose (installed, bump) | ^6.2.8 (have ^6.1.3) | JWT sign/verify (HS256, 7-day expiry in `lib/auth.ts`) | The only actively maintained JOSE implementation (panva). HS256 is **acceptable** for a single-issuer/single-verifier app IF the secret is ≥ 32 bytes (jose enforces this via `checkKeyLength`) and `algorithms` is pinned explicitly. Add `.setIssuer()/.setAudience()/.setJti()` at sign and `issuer/audience/algorithms` at verify. RS256/EdDSA+JWKS is only warranted with multiple independent verifiers — not this app. |
| Prisma + PostgreSQL (installed) | 6.19.x (CLI 6.19.3 / client 6.19.0 — align these) | ORM / data layer | Stay on Prisma 6. Prisma 7.9.1 exists but changes the generator/client layout and driver adapter story; bundling a major ORM migration into a security-hardening milestone is unacceptable risk. Prisma 6 has everything needed: interactive `$transaction`, `$queryRaw` (tagged templates = parameterized), type-safe `Prisma.*WhereInput`. |
| bcryptjs (installed) | ^3.0.3 | Password hashing (12 rounds) | Already installed and shipping 12-round hashes in the DB. Keep it. Do NOT swap to argon2/bcrypt native in this milestone — changing the hash algorithm invalidates every stored password and breaks login; defer to a proper rehash-migration phase if ever desired. |
| zod (installed, bump) | ^4.4.3 (have ^4.3.6) | Input validation + DTO allow-lists | The fix for both mass assignment (CWE-915) and unvalidated pagination. One strict schema per endpoint (`z.object({...}).strict()`, `.pick(...)`) and pass only the parsed result into Prisma `data`. Never spread `req.body` into Prisma (the current `{ ...body, ... }` PATCH `/api/bast/[id]` is a live mass-assignment vector). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-type | ^22.0.1 | Magic-byte MIME detection for uploads | SEC-04. Client `Content-Type` is attacker-controlled; `fileTypeFromBuffer()` on the first bytes is the reliable check. Combine with extension allowlist (jpg/jpeg/png/webp only). |
| sharp | ^0.35.3 | Image re-encode to strip embedded payloads/EXIF | Uploads pipeline: re-encode accepted images after validation. Destroys script payloads and EXIF; also lets you reject/rasterize SVG (SVG carries `<script>` → stored XSS on same origin — reject entirely for asset images). |
| vitest-mock-extended | ^5.1.1 | Deep mock of PrismaClient (`mockDeep`, `mockReset`) | Unit tests for services/route logic. Prisma's own unit-testing guide uses this. `$transaction` mocks as `(callback) => callback(prisma)`. |
| supertest | ^7.2.2 | Drive Next route handlers directly in integration tests | Auth/RBAC matrix tests: POST register-with-role → expect EMPLOYEE/403; BAST approval → assert `approverId`. Faster than E2E for the authorization matrix; Playwright reserved for real user flows. Compatible with Next 16 App Router route handlers. |
| @vitejs/plugin-react | ^6.0.5 | React support in Vitest | Only if/when client component tests are added (e.g., CSV-export escaping). Not required for the auth/RBAC-first suite. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | ^4.1.x unit test runner | **Choose Vitest over Jest** (see Alternatives). ESM + TS work natively through the Vite pipeline the project already uses; Prisma's 2026 testing series (updated Jul 2026) is written against Vitest 4 precisely because Prisma clients are ESM. Config: `environment: 'node'` for services/routes, `@/*` path alias via `resolve.alias`, `setupFiles` for `vitest-mock-extended`. |
| @playwright/test | ^1.62.1 | E2E suite (auth + RBAC + BAST workflow) | Run against a **production build** (`next build && next start`) via `webServer`, on a dedicated test database. `globalSetup` seeds; `storageState` captures login once per role (SUPER_ADMIN / ADMIN_INSTANSI / EMPLOYEE) so tests skip re-login; `workers: 1–2` when tests share the DB; `retries: 2`, `trace: on-first-retry` in CI. |
| @testing-library/react 16.3.x + @testing-library/jest-dom 7.0.x | component assertions | Optional — only for component-level tests (e.g., login form no longer printing demo credentials). Skip in the first suite. |
| tsx (installed) | ^4.23.x | Run TS scripts | Already the seed runner. Keep for scripts; replace raw-SQL seed with `prisma.upsert` calls per concerns. |

## Installation

```bash
# Bump existing (pin-compatible)
npm install jose@^6.2.8 zod@^4.4.3

# Upload validation & processing (SEC-04)
npm install file-type@^22.0.1 sharp@^0.35.3

# Dev dependencies — testing (TEST-01)
npm install -D vitest@^4.1.10 vitest-mock-extended@^5.1.1 supertest@^7.2.2 @vitejs/plugin-react@^6.0.5

# Dev dependencies — E2E
npm install -D @playwright/test@^1.62.1
npx playwright install chromium
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vitest 4 | Jest 30.4 | When a team already owns a large Jest config/culture. For this project: Next 16 + TS strict + ESM Prisma client all favor Vitest's zero-config ESM/TS; Prisma's official guides and `create-next-app --example with-vitest` both assume Vitest. Jest needs `ts-jest`/SWC + `esbuild-jest` worked around (GitHub discussion #13172) for no gain. |
| HS256 (pinned, strong secret, iss/aud) | RS256 / ES256 / EdDSA + JWKS | Only when the app grows multiple verifier services or a separate auth microservice. A single Next.js instance verifying its own tokens gains nothing from asymmetric keys except JWKS/key-rotation infrastructure. Revisit at that point. |
| Prisma 6.19 | Prisma 7.9 | When a later (non-security) milestone has budget to absorb the generator/client migration. Do not mix with hardening work. |
| bcryptjs (keep) | @node-rs/argon2 2.0 | Argon2id is objectively stronger, but swapping invalidates all stored `password123`-era hashes mid-hardening. Only after a dedicated rehash migration phase. |
| Native route handling (`request.formData()`) | multer / formidable | Multer is Express-middleware-oriented; Next route handlers read `File` objects natively via `request.formData()`. No parser dependency needed. |
| file-type + sharp | Custom magic-byte checks; `image-size` only | `image-size` validates dimensions but cannot detect polyglots or strip payloads — you need real content sniffing (file-type) plus re-encode (sharp) per OWASP File Upload Cheat Sheet. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `jsonwebtoken` (or any JWT lib other than jose) | Legacy callback API, CommonJS-only, past vulnerabilities; jose is already installed and is the maintained standard. | jose `SignJWT` / `jwtVerify` |
| Hardcoded `JWT_SECRET` fallback | CRITICAL SEC-01: if env is missing, tokens are signed with a published constant → anyone can forge SUPER_ADMIN. Fail fast at startup instead. | `throw new Error("JWT_SECRET is required")` at module load; never a default string |
| `public/uploads/` for user files | Next statically serves it; uploaded HTML/SVG = stored XSS on the app origin; also breaks on ephemeral-FS deploys. | Store under `uploads/` (or `private/`) outside `public/`; serve via an authenticated route with `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` |
| Spreading `req.body` into Prisma `data` | Mass assignment (CWE-915, OWASP API3:2023). `{ ...body, approverId }` lets any user set `status: "APPROVED"` or rewrite `bastNumber` — live today at `PATCH /api/bast/[id]`. | Zod schema per endpoint; construct `data` from parsed fields only |
| `$executeRawUnsafe` with string interpolation + `TRUNCATE ... CASCADE` seed | SQL-injection-prone pattern in `prisma/seed.ts`; destructive against any env it's run in. | `$queryRaw` tagged templates (parameterized) or, better, `prisma.model.upsert()`; make seed idempotent |
| `count()+1` / `parseInt(last.split("-")[2])+1` for BAST numbers | Racy under concurrency (two requests read same count → unique-constraint 500 — live BUG-03). | Sequence + unique constraint (accept gaps), or a counter row via interactive `prisma.$transaction` with `SELECT ... FOR UPDATE` if gapless is a hard business rule |
| `jest-mock-extended` | Jest-only; we run Vitest. | `vitest-mock-extended` 5.x (same `mockDeep` API) |
| NextAuth / Auth.js | Would rewrite the established custom-JWT + bcrypt + role-hierarchy flow. Not needed to harden it. | Harden the existing flow: issuer/audience/jti, fail-fast secret, `requireRole()` per endpoint |
| localStorage JWTs | XSS → full session theft. | Keep httpOnly/secure cookie session pattern (already in place); 7-day expiry → shorten or add version/revocation (see Patterns) |
| Helmet | Next manages security headers via `next.config.ts`; Helmet is Express-only anyway. | `headers()` in `next.config.ts` (CSP, nosniff, frame-ancestors) |

## Stack Patterns by Variant

**If the BAST number must be gapless (business rule):**
- Use a dedicated counter: interactive `prisma.$transaction` that locks a counter row (`SELECT ... FOR UPDATE`), increments, then creates the BAST — all inside `lib/services/bast-service.ts`. Accept serialization of creation.
- Because gapless serializes all creators, first verify the requirement actually demands it; otherwise a Postgres sequence + unique index on `bastNumber` is the cheap correct answer (gaps are normal and harmless).

**If tests must render components (CSV export escaping, forms):**
- Add `jsdom` (^30) environment + `@testing-library/react` + `@testing-library/jest-dom` to the Vitest config with a separate `environmentMatchGlobs` for `*.test.tsx`.

**If a future deploy is serverless (Vercel/edge):**
- Uploads must move to object storage (deferred per Project out-of-scope). `sharp` + `file-type` port unchanged; storage path becomes an abstraction (`lib/storage/`) from day one so local-filesystem → S3/R2 is a swap, not a rewrite.

**If the app ever splits into multiple services:**
- Migrate JWT to ES256/EdDSA with a published JWKS and `kid`; rotate keys on a cadence. Until then HS256 with a 32-byte+ secret and `iss/aud` pinning is the right cost/benefit.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| prisma 6.19.x | @prisma/client 6.19.x | **Align now**: CLI 6.19.3 vs client 6.19.0 installed; divergence causes subtle generated-client drift. |
| next 16.3.0 | eslint-config-next | Bump `eslint-config-next` 16.1.6 → 16.3.x; lint rules lag the framework (already flagged in concerns). |
| vitest 4.1.x | vitest-mock-extended 5.1.x | v5 targets Vitest ≥2; no peer conflicts with 4. |
| vitest 4.1.x | next 16.3 | Use the `with-vitest` pattern: `resolve.alias` for `@/*`, `transform` for TS; components needing `next/navigation` mocks only if component tests added. |
| sharp 0.35.x | Node runtime | Prebuilt binaries for win32 + Node ≥18; no build toolchain needed on the dev box. |
| file-type 22.x | sharp 0.35.x | file-type 22 is ESM-only — fine under Vitest (ESM) and Next route handlers; avoid jest CJS interop entirely by not choosing Jest. |

## Sources

- [Context7 /panva/jose] — SignJWT setters (iss/aud/jti/exp), jwtVerify with `issuer/audience/algorithms`, HMAC key-length enforcement — HIGH
- [Context7 /vercel/next.js v16] — proxy.ts middleware rename + config/type map + edge-runtime constraint — HIGH
- [Context7 /vercel/next.js — data-security.mdx] — auth checks must be re-verified inside server actions; IDOR ownership checks; never trust searchParams — HIGH
- [Context7 /vercel/next.js — server-actions.mdx] — built-in CSRF (Origin vs Host), 1MB action body cap, encrypted action refs — HIGH
- [Context7 /vercel/next.js — testing/vitest] — with-vitest example, App Router page tests — HIGH
- [Context7 /prisma/web — transactions] — interactive `$transaction`, Serializable isolation + P2034 retry, optimistic version column — HIGH
- [Prisma docs & blog — unit testing + testing series 1–2 (updated Jul 2026)] — mockDeep singleton pattern, Vitest 4 vs Jest rationale, `$transaction` mock recipe — HIGH
- [OWASP File Upload Cheat Sheet; PortSwigger File Uploads] — magic bytes, allowlists, store outside webroot, SVG/HTML XSS — HIGH
- [OWASP Mass Assignment Cheat Sheet; Safeguard CWE-915 analysis (2026-07)] — allow-list/DTO prevention — HIGH
- [Cybertec sequences-vs-invoice-numbers] — concurrency-safe document numbering: sequence vs SERIALIZABLE vs counter row — MEDIUM
- [RFC 9700 / OAuth 2.1 BCP summaries (2026): ci.am compass, michal-drozd.com] — short-lived access + rotating refresh, token-version revocation — HIGH
- npm registry `npm view` 2026-08-10 — exact current versions (next 16.3.0, prisma 7.9.1, jose 6.2.8, vitest 4.1.10, @playwright/test 1.62.1, file-type 22.0.1, sharp 0.35.3, zod 4.4.3) — HIGH
- Playwright docs/best-practices + E2E Next.js guides (2026) — production-build webServer, test DB isolation, storageState, workers/retries — HIGH

---
*Stack research for: EAMS security hardening (auth/RBAC, Prisma safety, JWT, uploads, testing)*
*Researched: 2026-08-10*