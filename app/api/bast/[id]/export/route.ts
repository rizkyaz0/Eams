// app/api/bast/[id]/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";
import { APP_CONFIG } from "@/lib/config";

/**
 * GET /api/bast/[id]/export?format=pdf|excel
 *
 * Export BAST ke PDF atau Excel.
 * GUARD: Hanya bisa dieksport jika statusSerah = APPROVED && statusTerima = APPROVED
 *
 * PDF format resmi:
 *   - Kop surat instansi (dari APP_CONFIG)
 *   - Judul: BERITA ACARA SERAH TERIMA BARANG/ASSET
 *   - Narasi otomatis (tanggal, tempat)
 *   - Tabel rincian barang
 *   - Blok tanda tangan (Yang Menyerahkan | Yang Menerima)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const { id }  = await params;
  const format  = request.nextUrl.searchParams.get("format") || "pdf";

  // Ambil data BAST lengkap
  const bast = await db.bast.findUnique({
    where: { id },
    include: {
      creator:   { select: { fullName: true, lembaga: true } },
      userSerah: { select: { fullName: true, lembaga: true } },
      userTerima:{ select: { fullName: true, lembaga: true } },
      details: {
        include: {
          asset: {
            include: {
              category: { select: { name: true, code: true } },
              location: { select: { name: true, code: true } },
            },
          },
        },
      },
    },
  });

  if (!bast) return notFoundResponse("BAST tidak ditemukan");

  // ✅ GUARD: Tidak bisa dicetak jika belum disetujui kedua pihak
  if (bast.statusSerah !== "APPROVED" || bast.statusTerima !== "APPROVED") {
    return errorResponse(
      "BAST belum bisa dicetak — harus disetujui oleh kedua pihak (Penyerah & Penerima) terlebih dahulu.",
      403
    );
  }

  const tanggal = bast.approvedAt || bast.effectiveDate || bast.createdAt;

  if (format === "excel") {
    return exportExcel(bast, tanggal);
  }

  return exportPdf(bast, tanggal);
}

// ─── Helper: format tanggal terbilang (untuk narasi PDF) ──────────────────
function terbilangHari(d: Date): string {
  return d.toLocaleDateString("id-ID", { weekday: "long" }).toUpperCase();
}
function terbilangBulan(d: Date): string {
  return d.toLocaleDateString("id-ID", { month: "long" }).toUpperCase();
}
function terbilangTahun(year: number): string {
  const satu = ["", "SATU", "DUA", "TIGA", "EMPAT", "LIMA", "ENAM", "TUJUH", "DELAPAN", "SEMBILAN",
                "SEPULUH", "SEBELAS", "DUA BELAS", "TIGA BELAS", "EMPAT BELAS", "LIMA BELAS",
                "ENAM BELAS", "TUJUH BELAS", "DELAPAN BELAS", "SEMBILAN BELAS"];
  const puluhan = ["", "", "DUA PULUH", "TIGA PULUH", "EMPAT PULUH", "LIMA PULUH",
                   "ENAM PULUH", "TUJUH PULUH", "DELAPAN PULUH", "SEMBILAN PULUH"];
  const ribuan = Math.floor(year / 1000);
  const ratusan = Math.floor((year % 1000) / 100);
  const sisaPuluhan = year % 100;
  let result = "";
  if (ribuan) result += (ribuan === 1 ? "SERIBU" : satu[ribuan] + " RIBU") + " ";
  if (ratusan) result += (ratusan === 1 ? "SERATUS" : satu[ratusan] + " RATUS") + " ";
  if (sisaPuluhan < 20) result += satu[sisaPuluhan];
  else result += puluhan[Math.floor(sisaPuluhan / 10)] + (sisaPuluhan % 10 ? " " + satu[sisaPuluhan % 10] : "");
  return result.trim();
}
function terbilangTanggal(d: Date): string {
  const day = d.getDate();
  const satu = ["", "SATU", "DUA", "TIGA", "EMPAT", "LIMA", "ENAM", "TUJUH", "DELAPAN", "SEMBILAN",
                "SEPULUH", "SEBELAS", "DUA BELAS", "TIGA BELAS", "EMPAT BELAS", "LIMA BELAS",
                "ENAM BELAS", "TUJUH BELAS", "DELAPAN BELAS", "SEMBILAN BELAS", "DUA PULUH",
                "DUA PULUH SATU", "DUA PULUH DUA", "DUA PULUH TIGA", "DUA PULUH EMPAT",
                "DUA PULUH LIMA", "DUA PULUH ENAM", "DUA PULUH TUJUH", "DUA PULUH DELAPAN",
                "DUA PULUH SEMBILAN", "TIGA PULUH", "TIGA PULUH SATU"];
  return satu[day] || String(day);
}

// ─── Kondisi aset → label Indonesia ───────────────────────────────────────
function kondisiLabel(c?: string | null): string {
  const map: Record<string, string> = {
    GOOD: "Baik",
    MINOR_DAMAGE: "Rusak Ringan",
    MAJOR_DAMAGE: "Rusak Berat",
    TOTAL_LOSS: "Hilang/Rusak Total",
  };
  return map[c || ""] || c || "Baik";
}

// ─── Export PDF ────────────────────────────────────────────────────────────
async function exportPdf(bast: any, tanggal: Date) {
  // Dynamic import agar tidak mempengaruhi bundle sisi client
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const cfg = APP_CONFIG.instansi;
  const pageW = doc.internal.pageSize.getWidth();
  const ml = 20; // margin left
  const mr = 20; // margin right
  const cw = pageW - ml - mr;

  // ── KOP SURAT ─────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(cfg.nama, pageW / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(cfg.unit, pageW / 2, 27, { align: "center" });
  doc.text(cfg.alamat, pageW / 2, 32, { align: "center" });
  if (cfg.telepon || cfg.email) {
    doc.text([cfg.telepon, cfg.email].filter(Boolean).join(" | "), pageW / 2, 37, { align: "center" });
  }

  // Garis bawah kop
  doc.setLineWidth(0.8);
  doc.line(ml, 41, pageW - mr, 41);
  doc.setLineWidth(0.3);
  doc.line(ml, 42.5, pageW - mr, 42.5);

  // ── JUDUL ──────────────────────────────────────────────────────────────
  let y = 52;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("BERITA ACARA SERAH TERIMA BARANG / ASET", pageW / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(11);
  doc.text(`Nomor: ${bast.bastNumber}`, pageW / 2, y, { align: "center" });
  y += 10;

  // ── NARASI ─────────────────────────────────────────────────────────────
  const d = new Date(tanggal);
  const narasiHari   = terbilangHari(d);
  const narasiTgl    = terbilangTanggal(d);
  const narasiBulan  = terbilangBulan(d);
  const narasiTahun  = terbilangTahun(d.getFullYear());
  const penyerah     = bast.userSerah?.lembaga  || bast.userSerah?.fullName  || "PIHAK PENYERAH";
  const penerima     = bast.userTerima?.lembaga || bast.userTerima?.fullName || "PIHAK PENERIMA";

  const narasi =
    `Pada hari ini ${narasiHari} tanggal ${narasiTgl} bulan ${narasiBulan} tahun ` +
    `${narasiTahun} bertempat di ${cfg.kota}, telah dilakukan serah terima barang/aset ` +
    `antara pihak ${penyerah} dengan ${penerima}.`;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const narasiLines = doc.splitTextToSize(narasi, cw);
  doc.text(narasiLines, ml, y);
  y += narasiLines.length * 5 + 4;

  doc.text("Adapun rincian barang/aset yang diserahterimakan adalah sebagai berikut:", ml, y);
  y += 8;

  // ── TABEL BARANG ────────────────────────────────────────────────────────
  const tableBody = bast.details.map((d: any, i: number) => [
    String(i + 1),
    d.asset?.name || "-",
    d.asset?.tagNumber || "-",
    d.asset?.category?.name || "-",
    d.asset?.location?.name || "-",
    kondisiLabel(d.conditionAfter),
    d.description || "-",
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: ml, right: mr },
    head: [["No.", "Nama Barang", "Kode/Tag", "Kategori", "Lokasi", "Kondisi", "Keterangan"]],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 40 },
      2: { cellWidth: 28 },
      3: { cellWidth: 24 },
      4: { cellWidth: 25 },
      5: { cellWidth: 18 },
    },
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 10;

  // ── PENUTUP ─────────────────────────────────────────────────────────────
  doc.setFontSize(10);
  const penutup = doc.splitTextToSize(
    "Demikian Berita Acara Serah Terima ini dibuat dengan sebenar-benarnya dan untuk dipergunakan sebagaimana mestinya, serta ditandatangani oleh kedua belah pihak.",
    cw
  );
  doc.text(penutup, ml, y);
  y += penutup.length * 5 + 14;

  // ── BLOK TANDA TANGAN ───────────────────────────────────────────────────
  const colW = cw / 2;
  const tanggalTtd = d.toLocaleDateString("id-ID", { dateStyle: "long" });

  // Kiri = Penyerah
  doc.setFont("helvetica", "bold");
  doc.text("Yang Menyerahkan,", ml, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${cfg.kota}, ${tanggalTtd}`, ml, y + 5);
  // Ruang tanda tangan
  y += 30;
  doc.text(bast.userSerah?.fullName || bast.recipientName || "-", ml, y);
  doc.text(bast.userSerah?.lembaga || "-", ml, y + 5);

  // Kanan = Penerima
  const xKanan = ml + colW;
  y -= 30;
  doc.setFont("helvetica", "bold");
  doc.text("Yang Menerima,", xKanan, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${cfg.kota}, ${tanggalTtd}`, xKanan, y + 5);
  y += 30;
  doc.text(bast.userTerima?.fullName || "-", xKanan, y);
  doc.text(bast.userTerima?.lembaga || "-", xKanan, y + 5);

  // Return PDF sebagai binary
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const filename = `BAST_${bast.bastNumber.replace(/\//g, "-")}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ─── Export Excel ──────────────────────────────────────────────────────────
async function exportExcel(bast: any, tanggal: Date) {
  const XLSX = await import("xlsx");
  const cfg  = APP_CONFIG.instansi;
  const d    = new Date(tanggal);

  // Sheet data
  const rows: any[][] = [
    [cfg.nama],
    [cfg.unit],
    [cfg.alamat],
    [],
    ["BERITA ACARA SERAH TERIMA BARANG / ASET"],
    [`Nomor: ${bast.bastNumber}`],
    [],
    [
      `Pada hari ini ${terbilangHari(d)} tanggal ${d.getDate()} bulan ` +
      `${d.toLocaleDateString("id-ID", { month: "long" })} tahun ${d.getFullYear()} ` +
      `bertempat di ${cfg.kota}, telah dilakukan serah terima barang antara pihak ` +
      `${bast.userSerah?.lembaga || "-"} dengan ${bast.userTerima?.lembaga || "-"}.`
    ],
    [],
    ["No.", "Nama Barang", "Kode/Tag", "Kategori", "Lokasi", "Kondisi", "Keterangan"],
    ...bast.details.map((item: any, i: number) => [
      i + 1,
      item.asset?.name || "-",
      item.asset?.tagNumber || "-",
      item.asset?.category?.name || "-",
      item.asset?.location?.name || "-",
      kondisiLabel(item.conditionAfter),
      item.description || "-",
    ]),
    [],
    ["Yang Menyerahkan,", "", "", "", "", "", "Yang Menerima,"],
    [],
    [],
    [bast.userSerah?.fullName || "-", "", "", "", "", "", bast.userTerima?.fullName || "-"],
    [bast.userSerah?.lembaga || "-", "", "", "", "", "", bast.userTerima?.lembaga || "-"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BAST");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `BAST_${bast.bastNumber.replace(/\//g, "-")}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
