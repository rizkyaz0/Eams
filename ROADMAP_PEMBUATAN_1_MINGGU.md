# 🗓️ ROADMAP PEMBUATAN EAMS — 1 MINGGU (100% SAMA DENGAN PRODUKSI)

## Panduan Step-by-Step Ujian Kompetensi Keahlian (UKK) SMK RPL

> **PENTING:** Roadmap ini menggunakan kode yang **100% sama persis** dengan aplikasi EAMS "Antigravity" yang sudah kita buat bersama. Ikuti langkah demi langkah dan hasilnya akan identik.

---

## ⏰ GAMBARAN 7 HARI

| Hari       | Target                                                     | Estimasi Jam |
| ---------- | ---------------------------------------------------------- | ------------ |
| **Hari 1** | Setup project, database, schema, seed                      | 4-5 jam      |
| **Hari 2** | Auth (login, logout, middleware, rate limit)               | 3-4 jam      |
| **Hari 3** | API Aset + Halaman Aset + Komponen Dialog                  | 5-6 jam      |
| **Hari 4** | API BAST + Halaman BAST + Dialog Pembuatan BAST            | 5-6 jam      |
| **Hari 5** | API & Halaman: User, Divisi, Lokasi, Kategori, Maintenance | 4-5 jam      |
| **Hari 6** | Dashboard, Laporan, Stock Opname, UI Polish                | 4-5 jam      |
| **Hari 7** | Testing menyeluruh + Deploy ke Vercel                      | 3-4 jam      |

---

## 🛠️ PERSIAPAN SEBELUM MULAI

### Software yang Wajib Terinstall

```
Node.js v20+    → https://nodejs.org
Git             → https://git-scm.com
VS Code         → https://code.visualstudio.com
```

### Akun Online yang Perlu Dibuat

```
GitHub   → https://github.com   (simpan kode)
Supabase → https://supabase.com (database gratis)
Vercel   → https://vercel.com   (hosting gratis, login via GitHub)
```

### Ekstensi VS Code (Install Semuanya)

```
Prisma
TypeScript Importer
Tailwind CSS IntelliSense
ES7+ React/Redux/React-Native snippets
```

---

# 🗓️ HARI 1: SETUP PROJECT & DATABASE

## Step 1.1 — Buat Project Next.js

```bash
npx create-next-app@latest eams --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd eams
```

## Step 1.2 — Install Semua Dependency (Sama Persis dengan Project Ini)

```bash
# Core dependencies — PERSIS sama dengan package.json aplikasi ini
npm install prisma @prisma/client bcryptjs jose
npm install @dnd-kit/core @dnd-kit/modifiers @dnd-kit/sortable @dnd-kit/utilities
npm install @hookform/resolvers @tanstack/react-table
npm install @tabler/icons-react lucide-react
npm install framer-motion
npm install html5-qrcode
npm install date-fns
npm install jspdf jspdf-autotable
npm install nodemailer
npm install next-themes
npm install recharts
npm install sonner
npm install vaul
npm install xlsx
npm install zod
npm install react-hook-form
npm install radix-ui
npm install class-variance-authority clsx tailwind-merge
npm install dotenv

# Dev dependencies
npm install -D @types/bcryptjs @types/nodemailer tsx
npm install -D shadcn tw-animate-css

# Setup shadcn/ui
npx shadcn@latest init
```

Saat `shadcn init` ditanya:

- Style: **Default**
- Base color: **Neutral**
- CSS variables: **Yes**

```bash
# Install semua komponen shadcn yang dipakai
npx shadcn@latest add button input label card dialog select textarea badge table
npx shadcn@latest add dropdown-menu sidebar sheet separator avatar skeleton
npx shadcn@latest add tooltip alert-dialog command popover calendar
npx shadcn@latest add tabs progress switch scroll-area collapsible
```

## Step 1.3 — Setup Supabase

1. Buka **supabase.com** → New Project → isi nama, pilih password, region: **Singapore**
2. Tunggu ±2 menit sampai project siap
3. Buka **Project Settings → Database → Connection string**
4. Copy dua URL: **Transaction pooler** (port 6543) dan **Session pooler** (port 5432)

## Step 1.4 — File .env (LENGKAP)

Buat file `.env` di root project:

```env
DATABASE_URL="postgresql://postgres.[PROJECT-ID]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-ID]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
JWT_SECRET=ini_secret_key_yang_sangat_panjang_dan_aman_minimal_32_karakter_123
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=emailkamu@gmail.com
SMTP_PASS=app-password-dari-google
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 1.5 — Prisma Schema (100% PERSIS SAMA)

Hapus isi `prisma/schema.prisma` dan ganti dengan ini:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Division {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  assets      Asset[]
  users       User[]
}

model Location {
  id          String   @id @default(cuid())
  name        String
  address     String?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  assets      Asset[]
}

model Category {
  id     String  @id @default(cuid())
  name   String  @unique
  assets Asset[]
}

model User {
  id            String     @id @default(cuid())
  email         String     @unique
  password      String
  fullName      String
  nip           String?    @unique
  role          UserRole   @default(EMPLOYEE)
  divisionId    String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  assetsHeld    Asset[]    @relation("CurrentHolder")
  auditLogs     AuditLog[]
  approvedBasts Bast[]     @relation("BastApprover")
  createdBasts  Bast[]     @relation("BastCreator")
  division      Division?  @relation(fields: [divisionId], references: [id])
  stockTakes    StockTake[]
}

model Asset {
  id                 String         @id @default(cuid())
  name               String
  tagNumber          String         @unique
  serialNumber       String?
  specification      String?
  description        String?
  purchaseDate       DateTime
  purchasePrice      Decimal        @db.Decimal(15, 2)
  salvageValue       Decimal?       @db.Decimal(15, 2)
  usefulLife         Int?
  depreciationMethod String?        @default("STRAIGHT_LINE")
  rfidData           String?
  imagePath          String?
  status             AssetStatus    @default(AVAILABLE)
  condition          AssetCondition @default(GOOD)
  categoryId         String
  locationId         String?
  holderId           String?
  divisionId         String?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
  category           Category       @relation(fields: [categoryId], references: [id])
  division           Division?      @relation(fields: [divisionId], references: [id])
  holder             User?          @relation("CurrentHolder", fields: [holderId], references: [id])
  location           Location?      @relation(fields: [locationId], references: [id])
  bastDetails        BastDetail[]
  maintenances       Maintenance[]
  stockTakeDetails   StockTakeDetail[]
  alerts             AssetAlert[]
  maintenancePrediction MaintenancePrediction?

  @@index([tagNumber])
  @@index([status])
  @@index([holderId])
}

model Bast {
  id                   String       @id @default(cuid())
  bastNumber           String       @unique
  type                 BastType
  description          String?
  fileUrl              String?
  status               String       @default("DRAFT")
  currentApprovalLevel Int?         @default(1)
  effectiveDate        DateTime     @default(now())
  recipientName        String?
  recipientPosition    String?
  approverName         String?
  loanStartDate        DateTime?
  loanEndDate          DateTime?
  approvedAt           DateTime?
  creatorId            String
  approverId           String?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt
  approver             User?        @relation("BastApprover", fields: [approverId], references: [id])
  creator              User         @relation("BastCreator", fields: [creatorId], references: [id])
  details              BastDetail[]
}

model BastDetail {
  id               String          @id @default(cuid())
  bastId           String
  assetId          String
  conditionBefore  AssetCondition?
  conditionAfter   AssetCondition
  targetLocationId String?
  targetHolderId   String?
  description      String?
  asset            Asset           @relation(fields: [assetId], references: [id])
  bast             Bast            @relation(fields: [bastId], references: [id], onDelete: Cascade)

  @@unique([bastId, assetId])
}

model Maintenance {
  id          String    @id @default(cuid())
  assetId     String
  description String
  cost        Decimal?  @db.Decimal(15, 2)
  vendorName  String?
  startDate   DateTime
  endDate     DateTime?
  status      String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  asset       Asset     @relation(fields: [assetId], references: [id])
}

model AuditLog {
  id        String   @id @default(cuid())
  action    String
  entity    String
  entityId  String
  userId    String
  oldValues Json?
  newValues Json?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])

  @@index([entity, entityId])
}

model StockTake {
  id        String   @id @default(cuid())
  title     String
  startDate DateTime
  endDate   DateTime?
  status    String   @default("OPEN")
  auditorId String
  auditor   User     @relation(fields: [auditorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  details   StockTakeDetail[]
}

model StockTakeDetail {
  id          String         @id @default(cuid())
  stockTakeId String
  assetId     String
  countedQty  Int            @default(0)
  variance    Int            @default(0)
  condition   AssetCondition?
  notes       String?
  stockTake   StockTake      @relation(fields: [stockTakeId], references: [id], onDelete: Cascade)
  asset       Asset          @relation(fields: [assetId], references: [id])
}

model AssetAlert {
  id          String   @id @default(cuid())
  assetId     String
  type        String
  description String?
  timestamp   DateTime @default(now())
  resolved    Boolean  @default(false)
  asset       Asset    @relation(fields: [assetId], references: [id])
}

model MaintenancePrediction {
  id                   String   @id @default(cuid())
  assetId              String   @unique
  predictedFailureDate DateTime
  confidenceScore      Float?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  asset                Asset    @relation(fields: [assetId], references: [id])
}

enum UserRole {
  SUPER_ADMIN
  ADMIN_INSTANSI
  STAFF_ASSET
  TEKNISI
  EMPLOYEE
}

enum AssetStatus {
  AVAILABLE
  IN_USE
  IN_MAINTENANCE
  MISSING
  DISPOSED
}

enum AssetCondition {
  GOOD
  MINOR_DAMAGE
  MAJOR_DAMAGE
  TOTAL_LOSS
}

enum BastType {
  PROCUREMENT
  ASSIGNMENT
  RETURN
  MUTATION
  MAINTENANCE_OUT
  MAINTENANCE_IN
  DISPOSAL
  STOCK_OPNAME
}
```

## Step 1.6 — Jalankan Migrasi

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## Step 1.7 — lib/db.ts (Koneksi Database)

```typescript
// lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;
```

## Step 1.8 — Seed Data Awal

Buat file `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Admin@123", 12);

  await prisma.user.upsert({
    where: { email: "admin@eams.com" },
    update: {},
    create: {
      email: "admin@eams.com",
      password: hashedPassword,
      fullName: "Administrator",
      nip: "000001",
      role: "SUPER_ADMIN",
    },
  });

  const divisiIT = await prisma.division.upsert({
    where: { code: "IT" },
    update: {},
    create: { code: "IT", name: "Divisi Teknologi Informasi", description: "Mengelola infrastruktur IT" },
  });

  await prisma.category.upsert({ where: { name: "Laptop" }, update: {}, create: { name: "Laptop" } });
  await prisma.category.upsert({ where: { name: "Printer" }, update: {}, create: { name: "Printer" } });
  await prisma.category.upsert({ where: { name: "Server" }, update: {}, create: { name: "Server" } });
  await prisma.category.upsert({ where: { name: "Jaringan" }, update: {}, create: { name: "Jaringan" } });

  await prisma.location.create({ data: { name: "Gedung A Lantai 1", address: "Jl. Sudirman No. 1" } });
  await prisma.location.create({ data: { name: "Gedung B Lantai 2", address: "Jl. Sudirman No. 1" } });
  await prisma.location.create({ data: { name: "Ruang Server", address: "Basement Gedung A" } });

  console.log("✅ Seed berhasil! Login: admin@eams.com / Admin@123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

Tambahkan ke `package.json` (field baru di level root):

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

```bash
npx prisma db seed
```

## Step 1.9 — next.config.ts (Security Headers)

```typescript
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=self, microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    formats: ["image/webp", "image/avif"],
    remotePatterns: [{ protocol: "https", hostname: "api.qrserver.com", pathname: "/v1/create-qr-code/**" }],
  },
  compress: true,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
```

## Step 1.10 — .gitignore

```
node_modules/
.next/
.env
*.tsbuildinfo
```

```bash
git init
git add .
git commit -m "hari 1: setup project, schema, seed"
```

### ✅ Checklist Hari 1

- [ ] `npm run dev` berjalan tanpa error di localhost:3000
- [ ] `npx prisma studio` terbuka dan ada tabel di database
- [ ] Data seed admin sudah masuk (cek di Prisma Studio)

---

# 🗓️ HARI 2: AUTENTIKASI

## Step 2.1 — lib/auth.ts (PERSIS SAMA)

```typescript
// lib/auth.ts
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";

if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable must be set.");
}
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);
const TOKEN_NAME = "auth-token";

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  [key: string]: unknown;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (typeof payload.userId === "string" && typeof payload.email === "string" && typeof payload.role === "string" && typeof payload.fullName === "string") {
      return payload as JWTPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME);
  if (!token) return null;
  return verifyToken(token.value);
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  ADMIN_INSTANSI: 4,
  STAFF_ASSET: 3,
  TEKNISI: 2,
  EMPLOYEE: 1,
};

export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
```

## Step 2.2 — lib/api-response.ts (PERSIS SAMA)

```typescript
// lib/api-response.ts
import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(data: T, message?: string, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function errorResponse(error: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status });
}

export function unauthorizedResponse(message = "Unauthorized"): NextResponse<ApiResponse> {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = "Forbidden - Insufficient permissions"): NextResponse<ApiResponse> {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = "Resource not found"): NextResponse<ApiResponse> {
  return errorResponse(message, 404);
}

export function validationErrorResponse(errors: Record<string, string>): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: "Validation failed", data: errors }, { status: 422 });
}
```

## Step 2.3 — lib/rate-limit.ts (PERSIS SAMA)

```typescript
// lib/rate-limit.ts
interface RateLimitEntry {
  count: number;
  firstAttemptAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const { limit, windowMs } = options;

  const existing = store.get(key);
  if (existing && now - existing.firstAttemptAt > windowMs) store.delete(key);

  const entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, firstAttemptAt: now });
    return { success: true, remaining: limit - 1, resetAt: new Date(now + windowMs) };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: new Date(entry.firstAttemptAt + windowMs) };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, resetAt: new Date(entry.firstAttemptAt + windowMs) };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}
```

## Step 2.4 — API Login (PERSIS SAMA)

```typescript
// app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { verifyPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_OPTIONS = { limit: 10, windowMs: 15 * 60 * 1000 };

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "127.0.0.1";

  const rateLimitResult = checkRateLimit(`login:${ip}`, RATE_LIMIT_OPTIONS);
  if (!rateLimitResult.success) {
    const resetIn = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 60000);
    return errorResponse(`Terlalu banyak percobaan login. Coba lagi dalam ${resetIn} menit.`, 429);
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) return errorResponse("Email dan password wajib diisi", 400);

    const user = await db.user.findUnique({
      where: { email },
      include: { division: true },
    });

    if (!user) return errorResponse("Email atau password salah", 401);

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) return errorResponse("Email atau password salah", 401);

    resetRateLimit(`login:${ip}`);

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    await setAuthCookie(token);

    return successResponse({ id: user.id, email: user.email, fullName: user.fullName, nip: user.nip, role: user.role, division: user.division }, "Login berhasil");
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Terjadi kesalahan server", 500);
  }
}
```

## Step 2.5 — API Logout & Me

```typescript
// app/api/auth/logout/route.ts
import { clearAuthCookie } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";

export async function POST() {
  await clearAuthCookie();
  return successResponse(null, "Logout berhasil");
}
```

```typescript
// app/api/auth/me/route.ts
import { getCurrentUser } from "@/lib/auth";
import { successResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();
  return successResponse(user);
}
```

## Step 2.6 — Middleware (proxy.ts — di ROOT PROJECT)

```typescript
// proxy.ts  ← letakkan di root, BUKAN di app/
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

const protectedRoutes = [
  "/dashboard",
  "/assets",
  "/bast",
  "/maintenance",
  "/users",
  "/categories",
  "/locations",
  "/history",
  "/reports",
  "/approvals",
  "/stocktake",
  "/settings",
  "/api/assets",
  "/api/users",
  "/api/bast",
  "/api/maintenance",
  "/api/categories",
  "/api/divisions",
  "/api/locations",
  "/api/reports",
  "/api/dashboard",
  "/api/stocktake",
  "/api/history",
  "/api/approvals",
];

const authRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = request.cookies.get("auth-token")?.value;
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const user = token ? await verifyToken(token) : null;

  if (isProtectedRoute && !user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please login again." }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete("auth-token");
    return response;
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user && pathname.startsWith("/api")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.userId);
    requestHeaders.set("x-user-role", user.role);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

> **CATATAN PENTING:** Di Next.js, middleware HARUS ada di file bernama `middleware.ts`. Buat file `middleware.ts` di root yang isinya hanya me-re-export dari `proxy.ts`:

```typescript
// middleware.ts
export { proxy as middleware, config } from "./proxy";
```

## Step 2.7 — Halaman Login (app/login/page.tsx)

Lihat file `components/login-form.tsx` di project asli untuk komponen lengkapnya. Intinya:

- Form email + password
- Fetch `POST /api/auth/login`
- Jika berhasil → `router.push("/dashboard")`
- Tampilan menggunakan Card + shadcn/ui components

## Step 2.8 — Layout Aplikasi Terautentikasi

```typescript
// app/(authenticated)/layout.tsx
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### ✅ Checklist Hari 2

- [ ] Login berhasil dengan admin@eams.com / Admin@123
- [ ] Cookie `auth-token` muncul di browser DevTools → Application → Cookies
- [ ] Buka `/dashboard` tanpa login → redirect ke `/login`
- [ ] Logout → cookie terhapus, redirect ke login

---

# 🗓️ HARI 3: MANAJEMEN ASET

## Step 3.1 — API Aset (PERSIS SAMA)

```typescript
// app/api/assets/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { AssetStatus, AssetCondition } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") as AssetStatus | null;
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [{ name: { contains: search, mode: "insensitive" } }, { tagNumber: { contains: search, mode: "insensitive" } }, { serialNumber: { contains: search, mode: "insensitive" } }];
    }

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          location: true,
          holder: { select: { id: true, fullName: true, email: true, nip: true } },
          division: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.asset.count({ where }),
    ]);

    return successResponse({ assets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Get assets error:", error);
    return errorResponse("Failed to fetch assets", 500);
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, tagNumber, serialNumber, specification, purchaseDate, purchasePrice, imagePath, categoryId, locationId, divisionId, status, condition, salvageValue, usefulLife, rfidData } = body;

    if (!name || !tagNumber || !purchaseDate || !purchasePrice || !categoryId) {
      return errorResponse("Name, tag number, purchase date, purchase price, and category are required", 400);
    }

    const existingAsset = await db.asset.findUnique({ where: { tagNumber } });
    if (existingAsset) return errorResponse("Asset with this tag number already exists", 409);

    const asset = await db.asset.create({
      data: {
        name,
        tagNumber,
        serialNumber: serialNumber || null,
        specification: specification || null,
        purchaseDate: new Date(purchaseDate),
        purchasePrice,
        imagePath: imagePath || null,
        categoryId,
        locationId: locationId || null,
        divisionId: divisionId || null,
        status: (status as AssetStatus) || AssetStatus.AVAILABLE,
        condition: (condition as AssetCondition) || AssetCondition.GOOD,
        salvageValue: salvageValue || null,
        usefulLife: usefulLife || null,
        rfidData: rfidData || null,
      },
      include: { category: true, location: true, division: true },
    });

    return successResponse(asset, "Asset created successfully", 201);
  } catch (error) {
    console.error("Create asset error:", error);
    return errorResponse("Failed to create asset", 500);
  }
}
```

## Step 3.2 — API Aset [id] (PERSIS SAMA)

```typescript
// app/api/assets/[id]/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";
import { AssetStatus, AssetCondition } from "@prisma/client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const asset = await db.asset.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        division: true,
        holder: { select: { id: true, fullName: true, email: true, nip: true } },
        bastDetails: {
          include: {
            bast: { select: { id: true, bastNumber: true, type: true, effectiveDate: true, creator: { select: { fullName: true } } } },
          },
          orderBy: { bast: { effectiveDate: "desc" } },
          take: 10,
        },
        maintenances: { orderBy: { startDate: "desc" }, take: 10 },
      },
    });

    if (!asset) return notFoundResponse("Asset not found");
    return successResponse(asset);
  } catch (error) {
    console.error("Get asset error:", error);
    return errorResponse("Failed to fetch asset", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();

    const existingAsset = await db.asset.findUnique({ where: { id } });
    if (!existingAsset) return notFoundResponse("Asset not found");

    const asset = await db.asset.update({
      where: { id },
      data: {
        name: body.name,
        tagNumber: body.tagNumber,
        serialNumber: body.serialNumber,
        specification: body.specification,
        description: body.description,
        categoryId: body.categoryId,
        locationId: body.locationId,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
        purchasePrice: body.purchasePrice,
        salvageValue: body.salvageValue ?? undefined,
        usefulLife: body.usefulLife ?? undefined,
        rfidData: body.rfidData ?? undefined,
        imagePath: body.imagePath,
        status: body.status,
        condition: body.condition,
      },
      include: { category: true, location: true, holder: { select: { id: true, fullName: true, email: true, nip: true } }, division: true },
    });

    return successResponse(asset, "Asset updated successfully");
  } catch (error) {
    console.error("Update asset error:", error);
    return errorResponse("Failed to update asset", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const existingAsset = await db.asset.findUnique({ where: { id } });
    if (!existingAsset) return notFoundResponse("Asset not found");

    // Soft delete — ubah status ke DISPOSED
    await db.asset.update({ where: { id }, data: { status: "DISPOSED", holderId: null } });

    return successResponse(null, "Asset marked as disposed successfully");
  } catch (error) {
    console.error("Delete asset error:", error);
    return errorResponse("Failed to delete asset", 500);
  }
}
```

## Step 3.3 — API Return Aset (PERSIS SAMA)

```typescript
// app/api/assets/[id]/return/route.ts
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { errorResponse, successResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";
import { BastType } from "@prisma/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const asset = await prisma.asset.findUnique({ where: { id }, include: { location: true, holder: true } });

    if (!asset) return notFoundResponse("Aset tidak ditemukan");
    if (asset.status !== "IN_USE") {
      return errorResponse(`Pengembalian gagal: Status aset "${asset.status}". Hanya IN_USE yang bisa dikembalikan.`, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      const existingCount = await tx.bast.count({
        where: { createdAt: { gte: new Date(year, date.getMonth(), 1), lt: new Date(year, date.getMonth() + 1, 1) } },
      });

      const bastNumber = `BAST/${year}/${month}/${String(existingCount + 1).padStart(4, "0")}`;
      const holderName = asset.holder?.fullName || "Tidak Diketahui";

      const newBast = await tx.bast.create({
        data: {
          bastNumber,
          type: BastType.RETURN,
          description: `Pengembalian aset: ${asset.name} — dari: ${holderName}`,
          status: "PENDING",
          effectiveDate: new Date(),
          recipientName: holderName,
          recipientPosition: "Pemegang Aset Terakhir",
          creatorId: user.userId,
          details: {
            create: [
              {
                assetId: asset.id,
                conditionBefore: asset.condition,
                conditionAfter: asset.condition,
                targetLocationId: asset.locationId ?? undefined,
                targetHolderId: null,
              },
            ],
          },
        },
      });

      await tx.asset.update({ where: { id: asset.id }, data: { status: "AVAILABLE", holderId: null } });
      return newBast;
    });

    return successResponse(result, "BAST Pengembalian berhasil dibuat.");
  } catch (error: any) {
    console.error("Return BAST error:", JSON.stringify(error, null, 2));
    return errorResponse(error.message || "Gagal membuat transaksi pengembalian", 500);
  }
}
```

### ✅ Checklist Hari 3

- [ ] `GET /api/assets` mengembalikan data
- [ ] `POST /api/assets` bisa menambah aset baru
- [ ] `PATCH /api/assets/[id]` bisa edit aset
- [ ] Halaman `/assets` menampilkan tabel aset dengan pagination

---

# 🗓️ HARI 4: BAST (BERITA ACARA SERAH TERIMA)

## Step 4.1 — API BAST GET & POST (PERSIS SAMA)

```typescript
// app/api/bast/route.ts  — lihat kode lengkap di Step atas (sudah dicopy persis)
```

Key points dari implementasinya:

1. **Auto-numbering** → hitung BAST bulan ini, format: `BAST/2026/03/0001`
2. **Transaction** → buat BAST + BastDetail dalam satu transaction DB
3. **Email notifikasi** → kirim ke semua ADMIN_INSTANSI & SUPER_ADMIN (fire-and-forget)
4. **Status default** → `PENDING` saat dibuat

## Step 4.2 — API BAST [id] PATCH (Approve/Reject — PERSIS SAMA)

```typescript
// app/api/bast/[id]/route.ts — kode sudah dicopy persis di atas

// Key logic saat PATCH status = "APPROVED":
// Gunakan $transaction:
// 1. Update BAST.status = APPROVED, approverId = user.userId
// 2. Untuk setiap BastDetail, update asset:
//    - condition → detail.conditionAfter
//    - locationId → detail.targetLocationId (jika ada)
//    - holderId → detail.targetHolderId (jika ada) → status = "IN_USE"
```

## Step 4.3 — Komponen CreateBastDialog

Komponen ini menggunakan **multi-step form** (2 langkah):

- **Step 1**: Pilih tipe BAST → fields muncul sesuai tipe (vendor untuk MAINTENANCE, alasan untuk DISPOSAL, dll.)
- **Step 2**: Pilih aset (dengan checkbox dan search)

Submit menggunakan `fetch("/api/bast", { method: "POST" })` — **bukan Server Action**.

Lihat file `components/create-bast-dialog.tsx` di project untuk kode lengkap.

### Tipe BAST dan Field yang Muncul:

| Tipe                      | Field Ekstra                                                  |
| ------------------------- | ------------------------------------------------------------- |
| `ASSIGNMENT` / `MUTATION` | Dropdown user sistem (penerima), Nama penerima, Lokasi tujuan |
| `RETURN`                  | — (otomatis dari asset detail)                                |
| `MAINTENANCE_OUT`         | Nama vendor, Deskripsi kerusakan, Estimasi kembali            |
| `MAINTENANCE_IN`          | Lokasi tujuan                                                 |
| `DISPOSAL`                | Alasan penghapusan, Metode (lelang/hibah/dll)                 |
| `PROCUREMENT`             | Sumber pengadaan, Nomor kontrak/SPK                           |

### ✅ Checklist Hari 4

- [ ] Buat BAST tipe ASSIGNMENT → aset berubah IN_USE
- [ ] Approve BAST → holderId dan locationId aset terupdate
- [ ] Nomor BAST format BAST/2026/03/0001 muncul otomatis
- [ ] Email notifikasi terkirim ke admin (cek smtp / mailtrap)

---

# 🗓️ HARI 5: USER, DIVISI, LOKASI, KATEGORI, MAINTENANCE

## Step 5.1 — Pola API yang Sama untuk Semua Entity

Semua API di bawah mengikuti pola yang sama: GET (list + pagination) dan POST (create). Di sini contoh untuk Users — terapkan pola yang sama untuk Divisions, Locations, Categories, Maintenance.

```typescript
// app/api/users/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search");
  const role = searchParams.get("role");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [{ fullName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { nip: { contains: search, mode: "insensitive" } }];
  }
  if (role) where.role = role;

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      select: { id: true, email: true, fullName: true, nip: true, role: true, createdAt: true, division: true },
      orderBy: { createdAt: "desc" },
    }),
    db.user.count({ where }),
  ]);

  return successResponse({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const { email, password, fullName, nip, role, divisionId } = await request.json();

  if (!email || !password || !fullName) return errorResponse("Email, password, fullName wajib diisi");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return errorResponse("Email sudah digunakan", 409);

  const hashedPassword = await hashPassword(password);
  const newUser = await db.user.create({
    data: { email, password: hashedPassword, fullName, nip: nip || null, role: role || "EMPLOYEE", divisionId: divisionId || null },
    select: { id: true, email: true, fullName: true, nip: true, role: true, division: true },
  });

  return successResponse(newUser, "User berhasil dibuat", 201);
}
```

Ulangi pola yang sama untuk:

- `app/api/divisions/route.ts` → `db.division.findMany/create`
- `app/api/locations/route.ts` → `db.location.findMany/create`
- `app/api/categories/route.ts` → `db.category.findMany/create`
- `app/api/maintenance/route.ts` → `db.maintenance.findMany/create`

## Step 5.2 — User Self-Protection UI

Di halaman `/users`, users-table sudah memiliki prop `currentUserId` yang didapat dari `GET /api/auth/me`. Row user yang sedang login akan tampil dengan:

- Badge kecil **"Anda"** di samping nama
- Kolom Actions menampilkan **"Akun aktif"** tanpa tombol Edit/Delete

### ✅ Checklist Hari 5

- [ ] CRUD user berfungsi, password ter-hash
- [ ] CRUD divisi, lokasi, kategori berfungsi
- [ ] Input maintenance aset berfungsi
- [ ] User tidak bisa hapus/edit dirinya sendiri

---

# 🗓️ HARI 6: DASHBOARD & LAPORAN

## Step 6.1 — API Dashboard (PERSIS SAMA)

```typescript
// app/api/dashboard/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const [totalAssets, assetsByStatus, totalUsers, usersByRole, recentBasts, maintenancePredictions] = await Promise.all([
      db.asset.count(),
      db.asset.groupBy({ by: ["status"], _count: { _all: true } }),
      db.user.count(),
      db.user.groupBy({ by: ["role"], _count: { _all: true } }),
      db.bast.findMany({
        take: 5, // ← Hanya 5 terbaru
        orderBy: { createdAt: "desc" },
        include: {
          creator: { select: { id: true, fullName: true } },
          _count: { select: { details: true } },
        },
      }),
      db.maintenancePrediction.findMany({
        where: { predictedFailureDate: { gte: new Date() } },
        orderBy: { predictedFailureDate: "asc" },
        take: 5,
        include: { asset: { select: { id: true, name: true, tagNumber: true } } },
      }),
    ]);

    return successResponse({
      totalAssets,
      assetsByStatus,
      totalUsers,
      usersByRole,
      recentBasts,
      maintenancePredictions,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse("Failed to fetch dashboard data", 500);
  }
}
```

## Step 6.2 — API Laporan & Export

```typescript
// app/api/reports/route.ts — versi sederhana
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get("type") || "asset-summary";

  try {
    if (reportType === "asset-summary") {
      const [byStatus, byCategory, byCondition] = await Promise.all([
        db.asset.groupBy({ by: ["status"], _count: { _all: true } }),
        db.asset.groupBy({ by: ["categoryId"], _count: { _all: true }, include: { category: true } }),
        db.asset.groupBy({ by: ["condition"], _count: { _all: true } }),
      ]);
      return successResponse({ byStatus, byCategory, byCondition });
    }

    if (reportType === "bast-history") {
      const basts = await db.bast.findMany({
        include: { creator: true, details: { include: { asset: true } } },
        orderBy: { createdAt: "desc" },
      });
      return successResponse(basts);
    }

    return errorResponse("Report type tidak dikenal");
  } catch (error) {
    return errorResponse("Gagal generate laporan", 500);
  }
}
```

## Step 6.3 — Stock Opname

```typescript
// app/api/stocktake/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const { title, startDate } = await request.json();

  const stockTake = await db.stockTake.create({
    data: {
      title,
      startDate: new Date(startDate),
      status: "OPEN",
      auditorId: user.userId,
    },
  });

  return successResponse(stockTake, "Stock opname dibuat", 201);
}
```

### ✅ Checklist Hari 6

- [ ] Dashboard menampilkan 5 BAST terbaru (bukan semua)
- [ ] Grafik distribusi aset per status tampil (Recharts)
- [ ] Export aset ke Excel (pakai library `xlsx`)
- [ ] Stock opname bisa dibuat dan diisi

---

# 🗓️ HARI 7: TESTING & DEPLOY

## Step 7.1 — Testing Sistematis

```
AUTENTIKASI
□ Login benar → masuk dashboard
□ Login salah 11x → "Terlalu banyak percobaan" (rate limit)
□ /dashboard tanpa login → redirect /login
□ Logout → kembali ke login

ASET
□ Tambah aset lengkap termasuk lokasi
□ Edit aset (semua field)
□ Hapus → status jadi DISPOSED
□ Filter per status, kategori, search

BAST
□ Buat BAST ASSIGNMENT → aset jadi IN_USE
□ Buat BAST MAINTENANCE_OUT → aset jadi IN_MAINTENANCE
□ Buat BAST DISPOSAL
□ Approve BAST → asset holder dan lokasi terupdate
□ Return dari halaman detail aset → BAST otomatis terbuat

USER & DATA MASTER
□ Tambah user baru
□ Tidak bisa hapus/edit diri sendiri (badge "Anda" muncul)
□ Tambah divisi, lokasi, kategori

DASHBOARD
□ Hanya 5 BAST terbaru tampil
□ Statistik aset akurat
```

## Step 7.2 — Deploy ke Vercel

```bash
# Push semua kode ke GitHub
git add .
git commit -m "final: siap deploy"
git push
```

1. Buka **vercel.com** → **Add New Project** → Import dari GitHub
2. Tambahkan Environment Variables (SAMA PERSIS dengan `.env`):
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL` → isi dengan URL Vercel yang diberikan (contoh: `https://eams-ukk.vercel.app`)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
3. Build Command sudah otomatis terbaca dari `package.json`:
   ```json
   "build": "prisma generate && next build"
   ```
   **PENTING:** `prisma generate` HARUS ada sebelum `next build` agar di Vercel tidak error!
4. Deploy → tunggu ±3 menit

## Step 7.3 — Troubleshooting Cepat

| Error                                    | Penyebab                                 | Solusi                                            |
| ---------------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| `Cannot find module '@prisma/client'`    | Prisma belum digenerate                  | `npx prisma generate`                             |
| `PrismaClientInitializationError`        | DATABASE_URL salah/kosong                | Cek file `.env`                                   |
| `Unexpected token '<'` di Vercel         | Server Action terdeteksi / routing error | Pastikan pakai `fetch()` bukan Server Action      |
| `401 Unauthorized` di semua API          | Cookie tidak terkirim                    | Cek `sameSite: "lax"` di setAuthCookie            |
| Build error di Vercel `prisma not found` | Build script tidak ada `prisma generate` | Tambah `"build": "prisma generate && next build"` |
| Tabel kosong setelah deploy              | DB belum di-seed di produksi             | Jalankan seed manual via Supabase SQL Editor      |

---

## 📌 SEMUA COMMAND PENTING

```bash
# ─── SETUP ───────────────────────────────
npx create-next-app@latest eams --typescript --tailwind --app --no-src-dir
cd eams && npm install prisma @prisma/client bcryptjs jose sonner lucide-react
npx shadcn@latest init

# ─── DATABASE ────────────────────────────
npx prisma migrate dev --name init   # Buat tabel berdasarkan schema
npx prisma generate                   # Generate Prisma Client
npx prisma db seed                    # Isi data awal
npx prisma studio                     # GUI database (buka di browser)
npx prisma migrate reset              # ⚠️ HAPUS SEMUA DATA dan ulang migrasi

# ─── DEVELOPMENT ─────────────────────────
npm run dev                           # Jalankan server development

# ─── GIT ─────────────────────────────────
git init && git add . && git commit -m "initial"
git remote add origin [URL-GitHub]
git push -u origin main

# ─── SETIAP HARI SETELAH CODING ──────────
git add .
git commit -m "hari X: [deskripsi]"
git push
# → Vercel otomatis deploy setelah push!
```

---

_Semangat! Kamu sudah punya panduan yang sangat lengkap. Ikuti langkah per langkah dan hasilnya akan sama 100% dengan aplikasi EAMS kita. 💪🚀_
