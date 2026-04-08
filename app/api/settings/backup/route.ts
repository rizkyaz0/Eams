// app/api/settings/backup/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser, hasMinimumRole } from "@/lib/auth";
import { errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * GET /api/settings/backup?format=csv|excel|sql
 *
 * Backup semua data ke format yang dipilih.
 * Hanya bisa diakses oleh SUPER_ADMIN dan ADMIN_INSTANSI.
 *
 * format=csv  → ZIP berisi beberapa file CSV (satu per tabel)
 * format=excel → Excel multi-sheet
 * format=sql  → SQL INSERT statements (bisa di-import ke PostgreSQL)
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  // Hanya admin yang bisa backup
  if (!hasMinimumRole(user.role, UserRole.ADMIN_INSTANSI)) {
    return forbiddenResponse("Hanya Admin yang dapat melakukan backup data");
  }

  const format = request.nextUrl.searchParams.get("format") || "excel";

  try {
    // Ambil semua data
    const [users, categories, locations, assets, basts] = await Promise.all([
      db.user.findMany({
        select: { id: true, username: true, fullName: true, email: true, nip: true, role: true, lembaga: true, isActive: true, createdAt: true },
      }),
      db.category.findMany({ select: { id: true, code: true, name: true, description: true, createdAt: true } }),
      db.location.findMany({ select: { id: true, code: true, name: true, address: true, description: true, createdAt: true } }),
      db.asset.findMany({
        select: {
          id: true, name: true, tagNumber: true, serialNumber: true,
          purchaseDate: true, purchasePrice: true, status: true, condition: true,
          category: { select: { name: true, code: true } },
          location: { select: { name: true, code: true } },
          createdAt: true,
        },
      }),
      db.bast.findMany({
        select: {
          id: true, bastNumber: true, type: true, status: true,
          statusSerah: true, statusTerima: true, effectiveDate: true,
          userSerah: { select: { fullName: true } },
          userTerima: { select: { fullName: true } },
          creator: { select: { fullName: true } },
          createdAt: true,
          _count: { select: { details: true } },
        },
      }),
    ]);

    if (format === "sql") {
      return exportSql(users, categories, locations, assets, basts);
    }

    if (format === "csv") {
      return exportCsv(users, categories, locations, assets, basts);
    }

    // Default: Excel
    return exportExcel(users, categories, locations, assets, basts);

  } catch (error) {
    console.error("Backup error:", error);
    return errorResponse("Gagal melakukan backup data", 500);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function toCSV(headers: string[], rows: any[][]): string {
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

import * as XLSX from "xlsx";
import JSZip from "jszip";

async function exportCsv(users: any[], categories: any[], locations: any[], assets: any[], basts: any[]) {
  const zip = new JSZip();

  zip.file("users.csv", toCSV(
    ["ID", "Username", "Nama Lengkap", "Email", "NIP", "Role", "Lembaga", "Aktif", "Dibuat"],
    users.map((u) => [u.id, u.username, u.fullName, u.email, u.nip, u.role, u.lembaga, u.isActive, u.createdAt])
  ));

  zip.file("categories.csv", toCSV(
    ["ID", "Kode", "Nama", "Deskripsi", "Dibuat"],
    categories.map((c) => [c.id, c.code, c.name, c.description, c.createdAt])
  ));

  zip.file("locations.csv", toCSV(
    ["ID", "Kode", "Nama", "Alamat", "Deskripsi", "Dibuat"],
    locations.map((l) => [l.id, l.code, l.name, l.address, l.description, l.createdAt])
  ));

  zip.file("assets.csv", toCSV(
    ["ID", "Nama", "Tag/QR", "Serial", "Kategori", "Lokasi", "Status", "Kondisi", "Harga Beli", "Tgl Beli", "Dibuat"],
    assets.map((a) => [a.id, a.name, a.tagNumber, a.serialNumber, a.category?.name, a.location?.name, a.status, a.condition, a.purchasePrice, a.purchaseDate, a.createdAt])
  ));

  zip.file("bast.csv", toCSV(
    ["ID", "No. BAST", "Tipe", "Status", "Status Serah", "Status Terima", "Pembuat", "User Serah", "User Terima", "Jml Barang", "Tgl Efektif", "Dibuat"],
    basts.map((b) => [b.id, b.bastNumber, b.type, b.status, b.statusSerah, b.statusTerima, b.creator?.fullName, b.userSerah?.fullName, b.userTerima?.fullName, b._count?.details, b.effectiveDate, b.createdAt])
  ));

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const rawBuffer = await zip.generateAsync({ type: "uint8array" });
  const buffer    = Buffer.from(rawBuffer);

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="EAMS_Backup_${timestamp}.zip"`,
    },
  });
}

async function exportExcel(users: any[], categories: any[], locations: any[], assets: any[], basts: any[]) {
  const wb   = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["ID", "Username", "Nama Lengkap", "Email", "NIP", "Role", "Lembaga", "Aktif", "Dibuat"],
    ...users.map((u) => [u.id, u.username, u.fullName, u.email, u.nip, u.role, u.lembaga, u.isActive ? "Ya" : "Tidak", u.createdAt]),
  ]), "Pengguna");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["ID", "Kode", "Nama", "Deskripsi", "Dibuat"],
    ...categories.map((c) => [c.id, c.code, c.name, c.description, c.createdAt]),
  ]), "Kategori");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["ID", "Kode", "Nama", "Alamat", "Deskripsi", "Dibuat"],
    ...locations.map((l) => [l.id, l.code, l.name, l.address, l.description, l.createdAt]),
  ]), "Lokasi");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["ID", "Nama Barang", "Kode QR / Tag", "Serial", "Kategori", "Kode Cat", "Lokasi", "Kode Lok", "Status", "Kondisi", "Harga Beli", "Tgl Pembelian", "Dibuat"],
    ...assets.map((a) => [a.id, a.name, a.tagNumber, a.serialNumber, a.category?.name, a.category?.code, a.location?.name, a.location?.code, a.status, a.condition, Number(a.purchasePrice), a.purchaseDate, a.createdAt]),
  ]), "Aset / Barang");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["ID", "No. BAST", "Tipe", "Status", "Status Serah", "Status Terima", "Pembuat", "User Serah", "User Terima", "Jml Barang", "Tgl Efektif", "Dibuat"],
    ...basts.map((b) => [b.id, b.bastNumber, b.type, b.status, b.statusSerah, b.statusTerima, b.creator?.fullName, b.userSerah?.fullName, b.userTerima?.fullName, b._count?.details, b.effectiveDate, b.createdAt]),
  ]), "BAST");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const buffer     = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="EAMS_Backup_${timestamp}.xlsx"`,
    },
  });
}

async function exportSql(users: any[], categories: any[], locations: any[], assets: any[], basts: any[]) {
  const esc = (v: any) => {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "boolean")        return v ? "TRUE"  : "FALSE";
    if (typeof v === "number")         return String(v);
    if (v instanceof Date)             return `'${v.toISOString()}'`;
    return `'${String(v).replace(/'/g, "''")}'`;
  };

  const lines: string[] = [
    "-- EAMS Database Backup",
    `-- Generated: ${new Date().toISOString()}`,
    "",
  ];

  // Categories
  lines.push("-- ============================\n-- TABLE: categories\n-- ============================");
  for (const c of categories) {
    lines.push(`INSERT INTO "Category" (id, code, name, description, "createdAt") VALUES (${esc(c.id)}, ${esc(c.code)}, ${esc(c.name)}, ${esc(c.description)}, ${esc(c.createdAt)});`);
  }
  lines.push("");

  // Locations
  lines.push("-- ============================\n-- TABLE: locations\n-- ============================");
  for (const l of locations) {
    lines.push(`INSERT INTO "Location" (id, code, name, address, description, "createdAt") VALUES (${esc(l.id)}, ${esc(l.code)}, ${esc(l.name)}, ${esc(l.address)}, ${esc(l.description)}, ${esc(l.createdAt)});`);
  }
  lines.push("");

  // Users (no password for security)
  lines.push("-- ============================\n-- TABLE: users (password excluded)\n-- ============================");
  for (const u of users) {
    lines.push(`INSERT INTO "User" (id, username, "fullName", email, nip, role, lembaga, "isActive", "createdAt") VALUES (${esc(u.id)}, ${esc(u.username)}, ${esc(u.fullName)}, ${esc(u.email)}, ${esc(u.nip)}, ${esc(u.role)}, ${esc(u.lembaga)}, ${esc(u.isActive)}, ${esc(u.createdAt)});`);
  }
  lines.push("");

  // Assets
  lines.push("-- ============================\n-- TABLE: assets\n-- ============================");
  for (const a of assets) {
    lines.push(`INSERT INTO "Asset" (id, name, "tagNumber", "serialNumber", status, condition, "purchasePrice", "purchaseDate", "createdAt") VALUES (${esc(a.id)}, ${esc(a.name)}, ${esc(a.tagNumber)}, ${esc(a.serialNumber)}, ${esc(a.status)}, ${esc(a.condition)}, ${esc(Number(a.purchasePrice))}, ${esc(a.purchaseDate)}, ${esc(a.createdAt)});`);
  }
  lines.push("");

  // BAST
  lines.push("-- ============================\n-- TABLE: bast\n-- ============================");
  for (const b of basts) {
    lines.push(`INSERT INTO "Bast" (id, "bastNumber", type, status, "statusSerah", "statusTerima", "effectiveDate", "createdAt") VALUES (${esc(b.id)}, ${esc(b.bastNumber)}, ${esc(b.type)}, ${esc(b.status)}, ${esc(b.statusSerah)}, ${esc(b.statusTerima)}, ${esc(b.effectiveDate)}, ${esc(b.createdAt)});`);
  }

  const sql = lines.join("\n");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  return new NextResponse(sql, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="EAMS_Backup_${timestamp}.sql"`,
    },
  });
}
