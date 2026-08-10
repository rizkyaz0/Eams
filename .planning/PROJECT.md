# EAMS — Enterprise Asset Management System

## What This Is

Sistem manajemen aset perusahaan (EAMS) berbasis web untuk mengelola siklus hidup aset: pencatatan aset, serah terima (BAST), pemeliharaan, dan pelaporan. Dibangun dengan Next.js 16 App Router + Prisma/PostgreSQL, dengan autentikasi JWT berbasis peran (SUPER_ADMIN → EMPLOYEE).

## Core Value

Siklus hidup aset tercatat dan terlacak dengan benar — dari pengadaan, serah terima (BAST), pemeliharaan, hingga disposal — dengan otorisasi peran yang aman di setiap langkah.

## Requirements

### Validated

- ✓ Autentikasi JWT (HS256, httpOnly cookie) + bcrypt 12 rounds — existing
- ✓ Hierarki peran: SUPER_ADMIN(5) → ADMIN_INSTANSI(4) → STAFF_ASSET(3) → TEKNISI(2) → EMPLOYEE(1) — existing
- ✓ CRUD aset dengan pagination, filter, tag-number unik, soft-delete (DISPOSED) — existing
- ✓ Upload gambar aset (multipart → `public/uploads/assets/`) — existing
- ✓ Alur BAST (create/approve/reject) via server actions + REST, cetak BAST — existing
- ✓ Pemeliharaan aset (maintenance tracking) — existing
- ✓ Master data: kategori, lokasi, divisi — existing
- ✓ Manajemen pengguna (admin) dengan `hasMinimumRole` — existing
- ✓ Dashboard agregasi + laporan (groupBy) — existing
- ✓ Timeline history (100 BAST + 100 maintenance terakhir) — existing
- ✓ Pemindai QR (html5-qrcode) untuk identifikasi aset — existing

### Active

- [ ] **SEC-01**: JWT_SECRET wajib di-set — fail fast saat startup, tanpa fallback hardcoded
- [ ] **SEC-02**: Registrasi publik tidak boleh menerima role dari body (selalu EMPLOYEE) atau diganti alur undangan admin
- [ ] **SEC-03**: Enforce role (`hasMinimumRole`) di semua endpoint mutasi (assets, bast, maintenance, categories, locations, divisions, server actions)
- [ ] **SEC-04**: Validasi upload gambar (allowlist tipe, magic bytes, batas ukuran, simpan di luar `public/`)
- [ ] **BUG-01**: Perbaiki `user.id` vs `user.userId` (auto-return BAST 500, approverId null)
- [ ] **BUG-02**: Konsolidasi logika BAST duplikat (REST vs server actions) ke satu service layer
- [ ] **BUG-03**: Perbaiki nomor BAST yang racy (counter dalam transaksi / DB sequence)
- [ ] **TEST-01**: Bangun suite test otomatis (auth+RBAC dulu, lalu BAST workflow)

### Out of Scope

- Integrasi email/SMS/notifikasi eksternal — belum dibutuhkan, tidak ada provider
- Object storage (S3) — migrasi dari filesystem lokal ditunda sampai deployment cloud
- Audit trail penuh (model AuditLog) — model ada tapi belum di-wire; ditunda setelah konsolidasi BAST
- Halaman `/settings` & self-service pengguna — 404 saat ini, ditunda
- Rate limiting login — ditunda ke fase lanjutan keamanan

## Context

- **Status:** Brownfield — aplikasi EAMS sudah berfungsi (v1.0.3, 5 commit), dipetakan via `/gsd-map-codebase` pada 2026-08-10.
- **Stack:** Next.js 16.3, React 19.2, TypeScript strict, Tailwind v4, shadcn/ui, Prisma 6.19 + PostgreSQL, jose (JWT), bcryptjs, zod (belum dipakai di API), TanStack Table, recharts, dnd-kit, html5-qrcode.
- **Arsitektur:** Hybrid — client pages fetch REST (`app/api/**`), sebagian server components query Prisma langsung, BAST mutations via server actions (`lib/actions/bast-actions.ts`). Middleware `proxy.ts` memverifikasi JWT; tiap route handler verifikasi ulang via `getCurrentUser()`.
- **Masalah kritis dari codebase map:** JWT secret fallback hardcoded (CRITICAL), registrasi publik dengan role arbitrer (CRITICAL), otorisasi peran hanya di 2 route users (HIGH), upload tanpa validasi (HIGH), bug `user.id` vs `user.userId` (2 bug live), logika BAST duplikat dengan perilaku divergen, nol test otomatis.
- **Data:** PostgreSQL via Prisma — 9 model (User, Division, Location, Category, Asset, Bast, BastDetail, Maintenance, AuditLog) + 4 enum. Seed raw-SQL destruktif (`TRUNCATE ... CASCADE`).
- **Dokumentasi:** README.md masih boilerplate create-next-app; BACKEND_README.md usang (referensi `middleware.ts` yang sudah jadi `proxy.ts`).

## Constraints

- **Tech stack**: Next.js 16 App Router + Prisma/PostgreSQL + Tailwind v4 — sudah terpasang, tidak diganti
- **Kompatibilitas**: TypeScript strict mode aktif — perbaikan tidak boleh menambah `any` baru
- **Keamanan**: JWT_SECRET harus dari env; tidak boleh ada fallback konstanta
- **Data**: Skema Prisma adalah source of truth; perubahan skema butuh migrasi
- **Deployment**: Belum ada target hosting; upload lokal `public/uploads/` butuh volume persisten

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Inisialisasi brownfield dari codebase EAMS | Codebase map sudah ada; fokus pada hardening keamanan + bug fix | — Pending |
| Fase pertama = keamanan & integritas data | 2 CRITICAL + 2 HIGH ditemukan di map; menghalangi produksi | — Pending |
| Konsolidasi BAST ke satu service layer | Perilaku divergen antara REST dan server actions | — Pending |
| Test suite dimulai dari auth+RBAC | Bug shipping (register-role, user.id) lolos karena nol test | — Pending |

## Evolution

Dokumen ini berevolusi pada transisi fase dan batas milestone.

**Setelah tiap transisi fase** (via `/gsd-transition`):
1. Requirements tidak valid? → Pindah ke Out of Scope dengan alasan
2. Requirements tervalidasi? → Pindah ke Validated dengan referensi fase
3. Requirements baru muncul? → Tambah ke Active
4. Keputusan perlu dicatat? → Tambah ke Key Decisions
5. "What This Is" masih akurat? → Update jika melenceng

**Setelah tiap milestone** (via `/gsd-complete-milestone`):
1. Review penuh semua seksi
2. Cek Core Value — masih prioritas yang benar?
3. Audit Out of Scope — alasan masih valid?
4. Update Context dengan state terkini

---
*Last updated: 2026-08-10 after initialization*