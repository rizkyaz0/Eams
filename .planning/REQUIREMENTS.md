# Requirements: EAMS — Enterprise Asset Management System

**Defined:** 2026-08-10
**Core Value:** Siklus hidup aset tercatat dan terlacak dengan benar — dari pengadaan, serah terima (BAST), pemeliharaan, hingga disposal — dengan otorisasi peran yang aman di setiap langkah.

## v1 Requirements

Requirements untuk milestone hardening keamanan + bug fix. Setiap requirement memetakan ke fase roadmap.

### Security — Autentikasi & Registrasi

- [x] **SEC-01**: Aplikasi gagal cepat (fail-fast) saat startup jika `JWT_SECRET` tidak di-set — tanpa fallback hardcoded
- [x] **SEC-02**: Registrasi publik selalu membuat user dengan role `EMPLOYEE`; role dari body request dihapus (tidak di-default)
- [x] **SEC-03**: Verifikasi JWT mem-pin `issuer`, `audience`, `algorithms: ['HS256']`, dan `jti` (jose)
- [x] **SEC-04**: Token punya `tokenVersion` — password berubah / logout-all → token lama ditolak (401)
- [x] **SEC-05**: `proxy.ts` deny-by-default — semua route di bawah `(authenticated)` dan `/api/*` dilindungi kecuali allow-list publik eksplisit; layout redirect ke `/login` saat unauthenticated

### Security — Otorisasi (RBAC)

- [x] **SEC-06**: Helper `requireUser()` (401) dan `requireRole(min)` (403) di `lib/security.ts` sebagai satu titik penegakan
- [x] **SEC-07**: Semua endpoint mutasi (assets, bast, maintenance, categories, locations, divisions) + server actions memanggil `requireRole()` sesuai role matrix
- [x] **SEC-08**: `PATCH /api/bast/[id]` tidak lagi menyebar body mentah (`{ ...body }`) — hanya field allow-list via zod `.strict()`
- [x] **SEC-09**: Respons error generik — tidak membocorkan `error.message` internal ke klien

### Security — Upload

- [ ] **SEC-10**: Upload gambar divalidasi magic bytes (file-type) dengan allowlist `jpeg|png|webp`; `image/svg+xml` ditolak
- [ ] **SEC-11**: Upload dibatasi ukuran 5 MB → 413; endpoint upload di-gate role (STAFF_ASSET minimum)
- [ ] **SEC-12**: File disimpan di luar `public/` (`<root>/uploads/assets/`) dengan nama acak server-side
- [ ] **SEC-13**: File disajikan via route terautentikasi dengan path-traversal guard, `Content-Type`/`Content-Disposition` tervalidasi, dan `nosniff`

### Bugs — Identitas & BAST

- [x] **BUG-01**: `user.id` vs `user.userId` diperbaiki — index signature dihapus dari `JWTPayload` sehingga bug mati saat compile; helper `assertUser()`/`getUserIdentity()` bertipe
- [x] **BUG-02**: Logika BAST dikonsolidasi ke satu `lib/services/bast-service.ts` — REST handlers + server actions menjadi thin adapters; transisi per `BastType` bertipe
- [x] **BUG-03**: Nomor BAST dibuat atomik di dalam transaksi create (counter row + `SELECT ... FOR UPDATE` via `$queryRaw`); unique index `bastNumber` sebagai backstop
- [x] **BUG-04**: Separation of duties — creator tidak bisa approve BAST sendiri
- [x] **BUG-05**: `approverId`/`approverName` tercatat benar saat approval (pakai `user.userId`)

### Data & Seed

- [x] **DATA-01**: Seed idempotent berbasis upsert — `TRUNCATE ... CASCADE` raw-SQL destruktif dihapus
- [x] **DATA-02**: Versi Prisma CLI (6.19.3) dan client (6.19.0) diselaraskan

### Testing

- [x] **TEST-01**: Infrastruktur Vitest + vitest-mock-extended terpasang (setup: redirect mock melempar, mock `next/headers`, `mockDeep<PrismaClient>`)
- [x] **TEST-02**: Unit test auth: env hilang → throw; iss/aud salah → ditolak; register dengan SUPER_ADMIN → tersimpan EMPLOYEE
- [x] **TEST-03**: Unit test RBAC matrix (empat cabang per mutasi: anonymous→401, role salah→403, wrong-owner→ditolak, admin→200)
- [x] **TEST-04**: Test BAST workflow: transisi legal mencatat approver; transisi ilegal menulis nol baris; REST vs server action menghasilkan outcome identik (invariant test)
- [ ] **TEST-05**: Test upload: svg ditolak, >5MB → 413, anonymous/employee → 401/403, tidak bisa diakses via URL statis
- [x] **TEST-06**: Test konkurensi numbering: 12 create paralel → 12 nomor unik, nol 500
- [ ] **TEST-07**: Playwright E2E di `next build && next start` dengan test DB terpisah (login → register-EMPLOYEE → mutasi admin → 403; BAST create → approve → custody update)

## v2 Requirements

Ditunda ke rilis berikutnya. Dilacak tapi tidak di roadmap saat ini.

### Differentiators

- **DIFF-01**: Matriks izin Role × Resource × Action sebagai source of truth terdokumentasi (`can(role, resource, action)`)
- **DIFF-02**: `available_actions` server-driven untuk UI BAST (UI tidak pernah menampilkan aksi yang ditolak backend)
- **DIFF-03**: Wiring AuditLog untuk transisi BAST + percobaan ditolak — hanya setelah konsolidasi BUG-02
- **DIFF-04**: Re-encode sharp untuk strip EXIF/polyglot
- **DIFF-05**: Alur admin-invite (butuh infrastruktur email/SMS yang belum ada)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migrasi Prisma 7 | Perubahan layout generator/client — risiko bundling tidak pantas di milestone hardening |
| Object storage (S3/R2) | Target deployment belum ditentukan; `lib/storage.ts` seam menjaga jalur upgrade |
| DB-backed permission engine | 5 role hierarkis tetap tidak membutuhkan junction tables |
| ClamAV / SVG sanitization pipeline | Allowlist + re-encode menutup vektor nyata |
| Rate limiting login | Ditunda ke fase keamanan lanjutan |
| Email/SMS notifikasi | Tidak ada provider; out of scope per PROJECT.md |
| Halaman `/settings` & self-service | 404 saat ini; ditunda |
| Audit trail penuh (AuditLog) | Hanya wiring dasar sebagai stretch di Phase 5; model penuh ditunda |
| Migrasi hash bcrypt → argon2 | Membatalkan semua password tersimpan; ditunda |
| NextAuth/Auth.js | jose sudah terpasang dan cukup |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| SEC-05 | Phase 1 | Complete |
| SEC-06 | Phase 2 | Complete |
| SEC-07 | Phase 2 | Complete |
| SEC-08 | Phase 2 | Complete |
| SEC-09 | Phase 2 | Complete |
| SEC-10 | Phase 4 | Pending |
| SEC-11 | Phase 4 | Pending |
| SEC-12 | Phase 4 | Pending |
| SEC-13 | Phase 4 | Pending |
| BUG-01 | Phase 1 | Complete |
| BUG-02 | Phase 2 | Complete |
| BUG-03 | Phase 3 | Complete |
| BUG-04 | Phase 2 | Complete |
| BUG-05 | Phase 2 | Complete |
| DATA-01 | Phase 3 | Complete |
| DATA-02 | Phase 1 | Complete |
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 1 | Complete |
| TEST-03 | Phase 2 | Complete |
| TEST-04 | Phase 2 | Complete |
| TEST-05 | Phase 4 | Pending |
| TEST-06 | Phase 3 | Complete |
| TEST-07 | Phase 5 | Pending |

**Coverage:**

- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-10*
*Last updated: 2026-08-10 after roadmap creation*
