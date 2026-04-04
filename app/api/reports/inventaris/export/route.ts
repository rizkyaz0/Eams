// app/api/reports/inventaris/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorizedResponse, errorResponse } from "@/lib/api-response";
import { APP_CONFIG } from "@/lib/config";

/**
 * GET /api/reports/inventaris/export?format=pdf|excel
 *
 * Export laporan inventaris aset.
 * PDF  → Surat resmi dengan kop instansi, tanda tangan penanggung jawab
 * Excel → Multi-sheet: Ringkasan + Data lengkap + per-kategori
 *
 * File ini bisa ditempatkan di: app/api/reports/inventaris/export/route.ts
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const format = request.nextUrl.searchParams.get("format") || "excel";
  const status = request.nextUrl.searchParams.get("status") || "";
  const categoryId = request.nextUrl.searchParams.get("categoryId") || "";

  try {
    // Ambil semua aset sesuai filter
    const assets = await db.asset.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(categoryId && { categoryId }),
      },
      include: {
        category: { select: { name: true, code: true } },
        location:  { select: { name: true, code: true } },
        holder:    { select: { fullName: true, nip: true } },
      },
      orderBy: { tagNumber: "asc" },
    });

    // Ambil statistik ringkasan
    const [totalAset, byStatus] = await Promise.all([
      db.asset.count({ where: { ...(categoryId && { categoryId }) } }),
      db.asset.groupBy({ by: ["status"], _count: { id: true } }),
    ]);

    if (format === "pdf") {
      return exportInventarisPdf(assets, { total: totalAset, byStatus });
    }

    return exportInventarisExcel(assets, { total: totalAset, byStatus });

  } catch (error) {
    console.error("Export inventaris error:", error);
    return errorResponse("Gagal mengekspor laporan inventaris", 500);
  }
}

// ─── label helpers ─────────────────────────────────────────────────────────

const statusLabel: Record<string, string> = {
  AVAILABLE:    "Tersedia", IN_USE:       "Digunakan",
  MAINTENANCE:  "Perbaikan", DISPOSED:    "Dihapus",
  LOST:         "Hilang",   DAMAGED:      "Rusak",
};

const kondisiLabel: Record<string, string> = {
  GOOD: "Baik", MINOR_DAMAGE: "Rusak Ringan",
  MAJOR_DAMAGE: "Rusak Berat", TOTAL_LOSS: "Hilang / Musnah",
};

const rupiah = (n: any) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);

// ─── PDF Export ────────────────────────────────────────────────────────────

async function exportInventarisPdf(assets: any[], stats: any) {
  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc   = new jsPDF({ orientation: "landscape", format: "a4" });
  const cfg   = APP_CONFIG.instansi;
  const today = new Date().toLocaleDateString("id-ID", { dateStyle: "long" });
  const pageW = doc.internal.pageSize.getWidth();

  // ── KOP SURAT ──────────────────────────────────────────────────────────
  doc.setFontSize(12).setFont("helvetica", "bold");
  doc.text(cfg.nama.toUpperCase(), pageW / 2, 18, { align: "center" });
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text(cfg.unit, pageW / 2, 24, { align: "center" });
  doc.text(`Jl. ${cfg.alamat}, ${cfg.kota}`, pageW / 2, 29, { align: "center" });
  doc.line(14, 33, pageW - 14, 33); // garis pembatas

  // ── JUDUL ───────────────────────────────────────────────────────────────
  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text("LAPORAN INVENTARIS ASET", pageW / 2, 42, { align: "center" });
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text(`Per tanggal: ${today}`, pageW / 2, 48, { align: "center" });
  doc.text(`Jumlah Aset: ${assets.length} item`, pageW / 2, 53, { align: "center" });

  // ── TABEL ───────────────────────────────────────────────────────────────
  const rows = assets.map((a, i) => [
    i + 1,
    a.tagNumber || "—",
    a.name,
    a.category?.name || "—",
    a.location?.name || "—",
    a.holder?.fullName || "—",
    statusLabel[a.status] || a.status,
    kondisiLabel[a.condition] || a.condition,
    rupiah(a.purchasePrice),
  ]);

  autoTable(doc, {
    startY: 58,
    head: [["No.", "Kode / Tag", "Nama Barang", "Kategori", "Lokasi", "Pemegang", "Status", "Kondisi", "Harga Perolehan"]],
    body: rows,
    theme: "striped",
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 8, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    columnStyles: { 8: { halign: "right" } },
  });

  // ── TANDA TANGAN ────────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
  doc.setFontSize(9);
  doc.text(`${cfg.kota}, ${today}`, pageW - 60, finalY + 12);
  doc.text("Pengelola Aset,", pageW - 60, finalY + 18);
  doc.line(pageW - 70, finalY + 42, pageW - 14, finalY + 42);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const pdfBytes  = doc.output("arraybuffer");

  return new NextResponse(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Inventaris_${timestamp}.pdf"`,
    },
  });
}

// ─── Excel Export ────────────────────────────────────────────────────────

async function exportInventarisExcel(assets: any[], stats: any) {
  const XLSX = await import("xlsx");
  const wb   = XLSX.utils.book_new();

  // Sheet 1 — Ringkasan
  const ringkasan = [
    ["LAPORAN INVENTARIS ASET"],
    [`Instansi: ${APP_CONFIG.instansi.nama}`],
    [`Unit: ${APP_CONFIG.instansi.unit}`],
    [`Tanggal: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`],
    [],
    ["Ringkasan Status", "Jumlah"],
    ...stats.byStatus.map((s: any) => [statusLabel[s.status] || s.status, s._count.id]),
    [],
    ["Total Aset", stats.total],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkasan), "Ringkasan");

  // Sheet 2 — Data Lengkap
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["No.", "Kode / Tag", "Nama Barang", "Serial Number", "Kategori", "Kode Kat.", "Lokasi", "Kode Lok.", "Pemegang", "NIP Pemegang", "Status", "Kondisi", "Harga Perolehan", "Tgl. Perolehan"],
    ...assets.map((a, i) => [
      i + 1,
      a.tagNumber,
      a.name,
      a.serialNumber || "",
      a.category?.name || "",
      a.category?.code || "",
      a.location?.name || "",
      a.location?.code || "",
      a.holder?.fullName || "",
      a.holder?.nip || "",
      statusLabel[a.status] || a.status,
      kondisiLabel[a.condition] || a.condition,
      Number(a.purchasePrice) || 0,
      a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString("id-ID") : "",
    ]),
  ]), "Data Lengkap");

  // Sheet 3 — Per Kategori (grouped)
  const grouped: Record<string, any[]> = {};
  for (const a of assets) {
    const key = a.category?.name || "Tanpa Kategori";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }
  const perKat: any[][] = [["Kategori", "Jumlah Aset", "Total Nilai"]];
  for (const [kat, items] of Object.entries(grouped)) {
    const total = items.reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0);
    perKat.push([kat, items.length, total]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(perKat), "Per Kategori");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const buffer    = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Inventaris_${timestamp}.xlsx"`,
    },
  });
}
