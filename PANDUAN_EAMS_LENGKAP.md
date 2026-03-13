# 📚 PANDUAN LENGKAP EAMS (Enterprise Asset Management System)

## Untuk Persiapan UKK SMK Jurusan RPL

> **Untuk:** Siswa SMK RPL yang ingin memahami aplikasi modern secara menyeluruh
> Dibuat dengan bahasa yang mudah dipahami — dari nol sampai paham!

---

# BAGIAN 1: APA ITU EAMS?

## 1.1 Pengertian

**EAMS (Enterprise Asset Management System)** adalah aplikasi web berbasis **manajemen aset instansi/perusahaan**. Fungsinya:

- 📦 **Mencatat dan melacak semua aset** (laptop, printer, meja, dll.)
- 📋 **Membuat BAST** (Berita Acara Serah Terima) — dokumen resmi ketika aset dipindahkan/diserahkan ke seseorang
- 👤 **Mengelola pengguna** dengan hak akses berbeda
- 🔧 **Mencatat maintenance** (perbaikan/perawatan) aset
- 📊 **Laporan dan grafik** kondisi aset secara real-time

## 1.2 Siapa Penggunanya?

| Role             | Bahasa Indonesia    | Hak Akses                    |
| ---------------- | ------------------- | ---------------------------- |
| `SUPER_ADMIN`    | Super Administrator | Bisa semua hal               |
| `ADMIN_INSTANSI` | Admin Instansi      | Bisa kelola user, aset, BAST |
| `STAFF_ASSET`    | Staff Aset          | Bisa input aset, buat BAST   |
| `TEKNISI`        | Teknisi             | Bisa input maintenance       |
| `EMPLOYEE`       | Karyawan            | Hanya lihat aset miliknya    |

---

# BAGIAN 2: TEKNOLOGI YANG DIGUNAKAN

## 2.1 Peta Teknologi (Tech Stack)

```
📱 FRONTEND (yang dilihat user)
├── Next.js 16     → Framework React untuk halaman web
├── React 19       → Library untuk membuat komponen UI
├── TypeScript     → JavaScript dengan tipe data yang ketat
├── Tailwind CSS   → Framework CSS untuk styling cepat
├── shadcn/ui      → Komponen UI siap pakai (tombol, dialog, tabel)
├── Recharts       → Library untuk membuat grafik
└── Lucide React   → Library ikon

⚙️  BACKEND (yang memproses data)
├── Next.js API Routes → Backend terintegrasi dalam 1 project
├── Prisma             → ORM - penghubung kode ke database
└── JWT (Jose)         → Token autentikasi yang aman

🗄️  DATABASE
└── PostgreSQL (Supabase) → Database relasional berbasis SQL

🚀 DEPLOYMENT
├── Vercel   → Hosting aplikasi Next.js
└── Supabase → Hosting database PostgreSQL gratis
```

## 2.2 Penjelasan Detail Setiap Teknologi

### 🔷 Next.js — "Otak" dari Aplikasi

**Apa itu?** Next.js adalah framework JavaScript yang memungkinkan kita membuat **frontend dan backend sekaligus dalam 1 project**. Tanpa Next.js, kita perlu 2 project terpisah.

**Kenapa dipakai?**

- **Full-stack**: 1 project = frontend + backend
- **SSR (Server-Side Rendering)**: Halaman dirender di server → lebih cepat dan SEO-friendly
- **App Router**: Sistem routing berbasis folder (buat folder = buat halaman baru)
- **API Routes**: Folder `app/api/` otomatis jadi endpoint API

**Analogi:** Next.js seperti rumah yang sudah punya kamar tamu DAN dapur sekaligus — tidak perlu beli rumah terpisah untuk masing-masing.

### 🔷 TypeScript — JavaScript yang "Lebih Pintar"

**Apa itu?** TypeScript adalah JavaScript dengan tambahan **tipe data**. Misalnya, kita bisa bilang "variabel ini harus berupa angka" — jika kita masukkan teks, TypeScript langsung kasih peringatan.

```typescript
// JavaScript biasa (tidak aman)
let harga = "seratus"; // Tidak ada peringatan!
harga = harga * 2; // Error saat runtime!

// TypeScript (lebih aman)
let harga: number = 100; // Tipe data eksplisit
harga = "seratus"; // ❌ Langsung error saat nulis kode!
```

**Kenapa dipakai?** Mencegah bug sebelum aplikasi dijalankan. Sangat penting di project besar.

### 🔷 Prisma — "Penerjemah" Antara Kode dan Database

**Apa itu?** Prisma adalah ORM (Object-Relational Mapper). Daripada menulis SQL mentah, kita pakai sintaks JavaScript yang lebih mudah.

```typescript
// Tanpa Prisma (SQL mentah)
const result = await db.query("SELECT * FROM assets WHERE status = 'AVAILABLE' LIMIT 10");

// Dengan Prisma (lebih mudah & aman)
const assets = await prisma.asset.findMany({
  where: { status: "AVAILABLE" },
  take: 10,
});
```

**Schema Prisma** adalah file `prisma/schema.prisma` yang mendefinisikan struktur database. Setiap `model` = satu tabel di database.

### 🔷 JWT (JSON Web Token) — "Kartu Tanda Pengenal" Digital

**Apa itu?** JWT adalah cara menyimpan informasi pengguna yang sudah login secara aman. Formatnya: `header.payload.signature`.

**Alur Login:**

```
1. User kirim email + password
2. Server cek ke database
3. Jika benar → Server buat JWT berisi { userId, role, nama }
4. JWT dikirim ke browser dalam Cookie (HttpOnly)
5. Setiap request berikutnya → Cookie otomatis dikirim
6. Server verifikasi JWT → tahu siapa yang request
```

**Kenapa Cookie, bukan localStorage?**

- **Cookie HttpOnly** = JavaScript tidak bisa baca isinya → aman dari serangan XSS
- **localStorage** = bisa dibaca JavaScript → berbahaya jika ada script jahat

### 🔷 PostgreSQL & Supabase

**PostgreSQL** adalah database relasional yang sangat handal (gratis dan open-source). Supabase adalah platform yang menyediakan PostgreSQL gratis + UI admin yang mudah dipakai.

---

# BAGIAN 3: ARSITEKTUR APLIKASI

## 3.1 Struktur Folder

```
antigravity/                    ← Root project
│
├── app/                        ← Semua halaman & API (Next.js App Router)
│   ├── (authenticated)/        ← Halaman yang butuh login
│   │   ├── dashboard/          ← Halaman /dashboard
│   │   │   └── page.tsx        ← Komponen React halaman dashboard
│   │   ├── assets/             ← Halaman /assets (daftar aset)
│   │   │   ├── page.tsx
│   │   │   └── [id]/           ← Halaman /assets/123 (detail aset)
│   │   │       └── page.tsx
│   │   ├── bast/               ← Halaman BAST
│   │   ├── users/              ← Halaman manajemen user
│   │   ├── maintenance/        ← Halaman maintenance
│   │   └── reports/            ← Halaman laporan
│   │
│   ├── api/                    ← Backend API Routes
│   │   ├── auth/               ← Endpoint autentikasi
│   │   │   ├── login/          → POST /api/auth/login
│   │   │   ├── logout/         → POST /api/auth/logout
│   │   │   └── me/             → GET /api/auth/me
│   │   ├── assets/             → GET/POST /api/assets
│   │   │   └── [id]/           → GET/PATCH/DELETE /api/assets/123
│   │   │       ├── return/     → POST /api/assets/123/return
│   │   │       └── images/     → POST /api/assets/123/images
│   │   ├── bast/               → GET/POST /api/bast
│   │   ├── users/              → GET/POST /api/users
│   │   └── dashboard/          → GET /api/dashboard
│   │
│   ├── login/                  ← Halaman login (tidak butuh auth)
│   └── globals.css             ← CSS global
│
├── components/                 ← Komponen UI yang bisa dipakai ulang
│   ├── ui/                     ← Komponen shadcn/ui (Button, Dialog, dll)
│   ├── create-asset-dialog.tsx ← Dialog form tambah aset
│   ├── create-bast-dialog.tsx  ← Dialog form buat BAST
│   ├── assets-table.tsx        ← Tabel daftar aset
│   └── app-sidebar.tsx         ← Sidebar navigasi
│
├── lib/                        ← Fungsi-fungsi utility
│   ├── db.ts                   ← Koneksi Prisma ke database
│   ├── auth.ts                 ← Fungsi login, verifikasi token, hash password
│   ├── api-response.ts         ← Format respons API standar
│   └── rate-limit.ts           ← Pembatas spam login
│
├── prisma/
│   ├── schema.prisma           ← Struktur/skema database
│   └── seed.ts                 ← Data awal (admin default)
│
├── proxy.ts                    ← Middleware autentikasi (pengganti middleware.ts)
├── next.config.ts              ← Konfigurasi Next.js
├── package.json                ← Daftar dependency
└── .env                        ← Variabel environment (rahasia!)
```

## 3.2 Alur Request (Bagaimana Data Mengalir)

Ketika user membuka halaman aset, ini yang terjadi di balik layar:

```
Browser                    proxy.ts              API Route           Database
   │                          │                     │                   │
   │  GET /assets             │                     │                   │
   │─────────────────────────▶│                     │                   │
   │                          │ Cek cookie auth-token                   │
   │                          │ Verifikasi JWT                          │
   │                          │─────────────────────▶│                  │
   │                          │                     │ prisma.asset.     │
   │                          │                     │ findMany()        │
   │                          │                     │──────────────────▶│
   │                          │                     │   Data aset       │
   │                          │                     │◀──────────────────│
   │                          │   JSON Response      │                   │
   │◀─────────────────────────────────────────────────│                  │
   │  Tampilkan tabel aset    │                     │                   │
```

---

# BAGIAN 4: ALUR FITUR UTAMA

## 4.1 Alur Autentikasi (Login/Logout)

```
PROSES LOGIN:
1. User isi form di /login → klik "Masuk"
2. Browser POST /api/auth/login dengan { email, password }
3. proxy.ts mengizinkan (/api/auth tidak dicegat middleware)
4. API Route:
   a. Cari user di database berdasarkan email
   b. Bandingkan password dengan bcrypt.compare()
   c. Jika cocok → buat JWT dengan jose.SignJWT()
   d. Set JWT sebagai Cookie HttpOnly
5. Browser redirect ke /dashboard

PROSES LOGOUT:
1. User klik tombol logout
2. Browser POST /api/auth/logout
3. API Route hapus cookie auth-token
4. Redirect ke /login

SETIAP REQUEST KE HALAMAN PROTECTED:
1. Browser otomatis kirim Cookie
2. proxy.ts ambil cookie → verifikasi JWT
3. Jika valid → lanjut ke halaman/API
4. Jika tidak valid → redirect ke /login
```

## 4.2 Alur BAST (Berita Acara Serah Terima)

**BAST** adalah dokumen paling penting dalam sistem ini. Setiap perpindahan aset harus dicatat dalam BAST.

```
JENIS BAST:
┌─────────────────┬──────────────────────────────────────┐
│ Tipe            │ Kapan dibuat                         │
├─────────────────┼──────────────────────────────────────┤
│ PROCUREMENT     │ Aset baru dibeli/diterima            │
│ ASSIGNMENT      │ Aset diserahkan ke karyawan          │
│ RETURN          │ Karyawan mengembalikan aset           │
│ MUTATION        │ Aset dipindah ke divisi/orang lain   │
│ MAINTENANCE_OUT │ Aset dikirim ke vendor perbaikan     │
│ MAINTENANCE_IN  │ Aset dikembalikan dari vendor        │
│ DISPOSAL        │ Aset dihapus/dimusnahkan             │
│ STOCK_OPNAME   │ Audit/penghitungan aset               │
└─────────────────┴──────────────────────────────────────┘

ALUR STATUS BAST:
DRAFT → PENDING → APPROVED
                ↘ REJECTED
```

**Alur Pembuatan BAST Serah Terima (ASSIGNMENT):**

```
1. Admin buka halaman /bast → klik "Buat BAST Baru"
2. Step 1: Pilih tipe = ASSIGNMENT
   → Muncul form: Pilih Penerima (dropdown user sistem)
   → Pilih Lokasi Tujuan
3. Step 2: Pilih Aset
   → Hanya aset AVAILABLE yang tampil
   → Centang aset yang akan diserahkan
4. Klik "Buat BAST" → POST /api/bast
5. API:
   a. Generate nomor BAST otomatis (misal: BAST/2026/03/0001)
   b. Simpan BAST ke database (status: PENDING)
   c. Simpan detail aset di tabel BastDetail
   d. Update status aset: AVAILABLE → IN_USE
   e. Update holderId aset = penerima baru
6. BAST siap di-approve oleh atasan
```

## 4.3 Alur Manajemen Aset

```
STATUS ASET (siklus hidup):
                 ┌──────────────┐
         ──────▶│  AVAILABLE   │◀──── (baru dibeli / dikembalikan)
                └──────┬───────┘
                       │ ASSIGNMENT (BAST)
                       ▼
                ┌──────────────┐
                │    IN_USE    │──── RETURN (BAST) ────▶ AVAILABLE
                └──────┬───────┘
                       │ MAINTENANCE_OUT (BAST)
                       ▼
                ┌────────────────┐
                │ IN_MAINTENANCE │──── MAINTENANCE_IN (BAST) ──▶ AVAILABLE
                └──────────────┘

Kondisi Aset (tidak tergantung status):
GOOD → MINOR_DAMAGE → MAJOR_DAMAGE → TOTAL_LOSS
```

---

# BAGIAN 5: DATABASE — TABEL DAN RELASI

## 5.1 Entity Relationship Diagram (ERD) Sederhana

```
User (Pengguna)
├── id, email, password, fullName, nip, role
├── divisionId (FK → Division)
└── [assetsHeld] → Asset (aset yang dipegang)

Asset (Aset)
├── id, name, tagNumber, serialNumber
├── purchaseDate, purchasePrice, salvageValue, usefulLife
├── status (AVAILABLE/IN_USE/IN_MAINTENANCE/MISSING/DISPOSED)
├── condition (GOOD/MINOR_DAMAGE/MAJOR_DAMAGE/TOTAL_LOSS)
├── categoryId (FK → Category)
├── locationId (FK → Location)
├── holderId (FK → User - pemegang saat ini)
└── divisionId (FK → Division)

Bast (Berita Acara Serah Terima)
├── id, bastNumber, type, status
├── recipientName, recipientPosition
├── effectiveDate, loanStartDate, loanEndDate
├── creatorId (FK → User)
├── approverId (FK → User)
└── [details] → BastDetail

BastDetail (Detail aset dalam BAST)
├── bastId (FK → Bast)
├── assetId (FK → Asset)
├── conditionBefore, conditionAfter
├── targetLocationId (FK → Location)
└── targetHolderId (FK → User)

Maintenance (Rekam Perbaikan)
├── assetId (FK → Asset)
├── description, cost, vendorName
├── startDate, endDate, status

Division (Divisi/Unit)
├── id, code, name, description

Location (Lokasi)
├── id, name, address, description

Category (Kategori Aset)
├── id, name
```

## 5.2 Cara Membaca Prisma Schema

```prisma
// prisma/schema.prisma

model Asset {
  id          String  @id @default(cuid())  // Primary key, auto-generate
  name        String                          // Nama aset (wajib)
  tagNumber   String  @unique                // Harus unik
  status      AssetStatus @default(AVAILABLE) // Default AVAILABLE

  // Relasi ke tabel lain:
  categoryId  String                          // Foreign key
  category    Category @relation(...)         // Objek Category terkait

  holderId    String?                         // ? = opsional (nullable)
  holder      User?    @relation(...)         // Pemegang aset (bisa null)
}

enum AssetStatus {    // Daftar nilai yang diperbolehkan
  AVAILABLE
  IN_USE
  IN_MAINTENANCE
  MISSING
  DISPOSED
}
```

---

# BAGIAN 6: API ROUTES — BACKEND

## 6.1 Format Standar API Response

Semua API di aplikasi ini menggunakan format yang sama:

```json
// Sukses
{
  "success": true,
  "data": { ... },
  "message": "Asset created successfully"
}

// Gagal
{
  "success": false,
  "error": "Asset not found",
  "statusCode": 404
}
```

## 6.2 Contoh API Route Lengkap

```typescript
// app/api/assets/route.ts

// GET /api/assets — Ambil daftar aset
export async function GET(request: NextRequest) {
  // 1. Cek autentikasi
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse(); // 401

  // 2. Ambil parameter dari URL
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";

  // 3. Query database
  const assets = await prisma.asset.findMany({
    where: {
      name: { contains: search, mode: "insensitive" },
    },
    skip: (page - 1) * 10,
    take: 10,
    include: { category: true, location: true },
  });

  // 4. Return response
  return successResponse({ assets, total });
}

// POST /api/assets — Buat aset baru
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();

  // Validasi
  if (!body.name || !body.tagNumber) {
    return errorResponse("Nama dan tag number wajib diisi", 400);
  }

  // Simpan ke database
  const asset = await prisma.asset.create({
    data: {
      name: body.name,
      tagNumber: body.tagNumber,
      categoryId: body.categoryId,
      purchaseDate: new Date(body.purchaseDate),
      purchasePrice: body.purchasePrice,
    },
  });

  return successResponse(asset, "Asset created", 201);
}
```

## 6.3 HTTP Methods — Konvensi REST API

| Method   | Fungsi               | Contoh                              |
| -------- | -------------------- | ----------------------------------- |
| `GET`    | Mengambil data       | GET /api/assets → daftar aset       |
| `POST`   | Membuat data baru    | POST /api/assets → buat aset        |
| `PATCH`  | Update sebagian data | PATCH /api/assets/123 → edit aset   |
| `DELETE` | Hapus data           | DELETE /api/assets/123 → hapus aset |

---

# BAGIAN 7: MIDDLEWARE (proxy.ts)

## 7.1 Apa itu Middleware?

Middleware adalah **penjaga gerbang** — setiap request yang masuk ke server akan melewatinya terlebih dahulu, sebelum sampai ke halaman atau API yang dituju.

```
Request Browser
      │
      ▼
  proxy.ts          ← MIDDLEWARE (penjaga gerbang)
  ├── Ada cookie? → Verifikasi JWT
  ├── Route protected? → Boleh masuk / redirect login
  └── Teruskan request (dengan info user di header)
      │
      ▼
  API Route / Halaman
```

## 7.2 Kenapa Namanya proxy.ts, Bukan middleware.ts?

Next.js secara default membaca file `middleware.ts`. Di project ini namanya diubah ke `proxy.ts`, tapi di `next.config.ts` dikonfigurasi agar tetap dikenali sebagai middleware. Ini hanya konvensi penamaan project ini saja.

---

# BAGIAN 8: AUTENTIKASI SECARA MENDALAM

## 8.1 Hashing Password

Password tidak boleh disimpan langsung di database! Selalu di-**hash** (dienkripsi satu arah).

```typescript
// Saat registrasi/buat user:
import bcrypt from "bcryptjs";
const hashedPassword = await bcrypt.hash("password123", 10);
// Hasil: "$2a$10$..." (tidak bisa dikembalikan ke "password123")

// Saat login — BANDINGKAN (bukan decrypt):
const isValid = await bcrypt.compare("password123", hashedPassword);
// true jika cocok, false jika tidak
```

## 8.2 JWT Token — Struktur Lengkap

```
JWT = eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhYmMxMjMifQ.xyz

Format: Header.Payload.Signature
         (base64)  (base64)   (HMAC-SHA256)

Payload berisi:
{
  "userId": "clx123abc",
  "email": "admin@example.com",
  "role": "ADMIN_INSTANSI",
  "fullName": "Budi Santoso",
  "exp": 1712345678  ← waktu expired (7 hari)
}
```

**PENTING:** JWT tidak dienkripsi, hanya di-encode. Siapapun bisa baca isinya, tapi tidak bisa MEMALSUKAN signature tanpa `JWT_SECRET`.

---

# BAGIAN 9: PERTANYAAN YANG MUNGKIN DITANYA SAAT UJIAN

## 9.1 Pertanyaan Teknis

**Q: Apa perbedaan JavaScript dan TypeScript?**
A: JavaScript adalah bahasa scripting tanpa tipe data. TypeScript adalah superset JavaScript yang menambahkan sistem tipe data statis, sehingga error bisa terdeteksi saat koding, bukan saat runtime.

**Q: Jelaskan apa itu REST API!**
A: REST API adalah antarmuka komunikasi antara frontend dan backend menggunakan protokol HTTP. Backend menyediakan endpoint (URL) dengan method tertentu (GET, POST, PATCH, DELETE). Frontend memanggil endpoint ini, backend memproses dan mengembalikan data dalam format JSON.

**Q: Apa itu ORM? Kenapa pakai Prisma?**
A: ORM (Object-Relational Mapper) adalah tool yang menghubungkan kode program ke database tanpa harus menulis SQL mentah. Prisma dipakai karena syntax-nya intuitif, mendukung TypeScript secara penuh, dan otomatis generate schema dari definisi model.

**Q: Apa itu JWT dan bagaimana cara kerjanya?**
A: JWT (JSON Web Token) adalah token berbentuk string terenkripsi yang digunakan untuk autentikasi stateless. Server membuat JWT berisi data user setelah login berhasil. Setiap request berikutnya, client mengirim token ini. Server memverifikasi signature JWT menggunakan secret key — jika valid, server tahu siapa yang request tanpa perlu query database.

**Q: Apa itu middleware dan apa fungsinya?**
A: Middleware adalah fungsi yang dijalankan sebelum request sampai ke handler utama. Fungsinya bisa bermacam-macam: autentikasi, logging, rate limiting, CORS handling, dll.

**Q: Kenapa password di-hash? Apa itu bcrypt?**
A: Password di-hash agar jika database bocor, password tetap tidak bisa dibaca. Bcrypt adalah algoritma hashing yang sengaja dibuat lambat (computationally expensive) untuk mencegah brute force attack. Hashing bersifat satu arah — tidak bisa dikembalikan ke password asli.

**Q: Apa perbedaan SQL dan NoSQL database?**
A: SQL (seperti PostgreSQL, MySQL) menyimpan data dalam tabel dengan relasi yang ketat dan schema yang tetap. Cocok untuk data terstruktur dengan relasi kompleks. NoSQL (seperti MongoDB) menyimpan data sebagai dokumen JSON tanpa schema ketat. Cocok untuk data yang tidak terstruktur dan skala besar. EAMS menggunakan PostgreSQL karena data aset sangat terstruktur dan memiliki banyak relasi.

**Q: Jelaskan apa itu CRUD!**
A: CRUD = Create, Read, Update, Delete. Empat operasi dasar dalam manajemen data. Dalam REST API: Create=POST, Read=GET, Update=PATCH/PUT, Delete=DELETE.

**Q: Apa itu deployment? Kenapa pakai Vercel?**
A: Deployment adalah proses memindahkan aplikasi dari komputer developer ke server publik agar bisa diakses internet. Vercel dipilih karena khusus dioptimalkan untuk Next.js (keduanya dibuat oleh tim yang sama), memiliki tier gratis yang cukup, dan deployment otomatis dari GitHub.

## 9.2 Pertanyaan Konseptual

**Q: Jelaskan alur kerja aplikasi EAMS secara singkat!**
A: EAMS adalah sistem manajemen aset digital. Alurnya: Admin login → masuk dashboard → tambah aset baru → ketika aset perlu diserahkan ke karyawan, buat BAST (Berita Acara Serah Terima) → pilih penerima dan aset → BAST disetujui atasan → sistem otomatis update status dan penanggung jawab aset → semua riwayat tercatat.

**Q: Apa kelebihan aplikasi web dibanding aplikasi desktop?**
A: Aplikasi web bisa diakses dari mana saja menggunakan browser, tidak perlu install, update terpusat di server, dan bisa digunakan di berbagai OS dan perangkat secara bersamaan oleh banyak user.

**Q: Mengapa BAST itu penting dalam sistem manajemen aset?**
A: BAST adalah dokumen legal yang membuktikan perpindahan tanggung jawab atas suatu aset. Tanpa BAST, tidak ada bukti formal siapa yang bertanggung jawab atas aset tersebut — ini penting untuk audit dan mencegah kehilangan aset yang tidak tercatat.

---

# BAGIAN 10: GLOSSARY ISTILAH PENTING

| Istilah                  | Artinya                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| **Framework**            | Kerangka kerja yang menyediakan struktur dan tools untuk membangun aplikasi |
| **Library**              | Kumpulan kode yang bisa digunakan kembali untuk fungsi tertentu             |
| **Dependency**           | Library/package yang dibutuhkan agar aplikasi bisa berjalan                 |
| **npm**                  | Node Package Manager — tools untuk install/kelola library JavaScript        |
| **node_modules**         | Folder berisi semua library yang terinstall                                 |
| **package.json**         | File daftar dependency dan konfigurasi project                              |
| **Git**                  | Sistem version control — melacak perubahan kode                             |
| **GitHub**               | Platform hosting kode berbasis Git                                          |
| **Environment Variable** | Variabel konfigurasi rahasia yang tidak boleh di-commit ke Git              |
| **API**                  | Application Programming Interface — cara dua sistem berkomunikasi           |
| **JSON**                 | JavaScript Object Notation — format data yang umum di web                   |
| **CRUD**                 | Create, Read, Update, Delete — operasi dasar data                           |
| **ORM**                  | Object-Relational Mapper — abstraksi database                               |
| **JWT**                  | JSON Web Token — token autentikasi                                          |
| **Hash**                 | Proses mengubah data menjadi string tetap (satu arah)                       |
| **Cookie**               | Data kecil yang disimpan browser, dikirim di setiap request                 |
| **Middleware**           | Fungsi pemroses sebelum request sampai ke handler                           |
| **Endpoint**             | URL yang bisa diakses untuk operasi API tertentu                            |
| **Foreign Key**          | Kolom yang merujuk ke primary key tabel lain (relasi)                       |
| **Migration**            | Proses mengubah struktur database secara terstruktur                        |
| **Deployment**           | Proses publikasi aplikasi ke server publik                                  |
| **Repository**           | Tempat penyimpanan kode di Git/GitHub                                       |
| **Commit**               | Snapshots perubahan kode yang disimpan di Git                               |
| **Push**                 | Mengirim commit lokal ke repository remote (GitHub)                         |
| **Pull**                 | Mengambil perubahan dari repository remote ke lokal                         |
| **Branch**               | Cabang pengembangan terpisah dari kode utama                                |
| **Component**            | Unit UI yang bisa digunakan ulang dalam React                               |
| **Props**                | Data yang dikirim dari komponen induk ke komponen anak                      |
| **State**                | Data yang bisa berubah dalam komponen React                                 |
| **Hook**                 | Fungsi React untuk menambah fitur ke komponen (useState, useEffect)         |
| **useEffect**            | Hook untuk side effects: fetch data, subscribe event, dll.                  |
| **useState**             | Hook untuk menyimpan state dalam komponen                                   |
| **async/await**          | Sintaks untuk menangani operasi asynchronous (seperti fetch data)           |
| **Promise**              | Objek yang merepresentasikan operasi asynchronous                           |
| **SSR**                  | Server-Side Rendering — render HTML di server                               |
| **CSR**                  | Client-Side Rendering — render HTML di browser                              |

---

_Dokumen ini dibuat khusus untuk mempersiapkan UKK SMK RPL. Semangat! 🚀_
