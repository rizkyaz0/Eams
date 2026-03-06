// app/api/reports/export/route.ts
// Export asset report as PDF or Excel using jsPDF and xlsx
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { unauthorizedResponse, errorResponse } from "@/lib/api-response";
import prisma from "@/lib/db";
import { AssetStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "excel"; // "excel" | "pdf"
  const status = searchParams.get("status") as AssetStatus | null;
  const categoryId = searchParams.get("categoryId");

  try {
    // Build filter
    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        tagNumber: true,
        name: true,
        status: true,
        condition: true,
        purchaseDate: true,
        purchasePrice: true,
        salvageValue: true,
        usefulLife: true,
        category: { select: { name: true } },
        location: { select: { name: true } },
        holder: { select: { fullName: true } },
      },
    });

    const rows = assets.map((a) => ({
      "Tag Number": a.tagNumber,
      "Nama Aset": a.name,
      Kategori: a.category.name,
      Lokasi: a.location?.name ?? "-",
      "Penanggung Jawab": a.holder?.fullName ?? "-",
      Status: a.status,
      Kondisi: a.condition,
      "Tanggal Beli": a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString("id-ID") : "-",
      "Harga Beli (Rp)": a.purchasePrice ? Number(a.purchasePrice).toLocaleString("id-ID") : "-",
      "Nilai Sisa (Rp)": a.salvageValue ? Number(a.salvageValue).toLocaleString("id-ID") : "-",
      "Masa Pakai (Bulan)": a.usefulLife ?? "-",
    }));

    if (format === "excel") {
      // Dynamic import to avoid SSR issues with browser-only xlxs builds
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto-width columns
      const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
        wch: Math.max(key.length, ...rows.map((r: any) => String(r[key] ?? "").length)) + 2,
      }));
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Laporan Aset");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new Response(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="laporan-aset-${new Date().toISOString().split("T")[0]}.xlsx"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    if (format === "pdf") {
      // Use jsPDF + autotable for server-side PDF
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Laporan Inventaris Aset", 14, 15);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Dicetak: ${new Date().toLocaleDateString("id-ID", { dateStyle: "full" })} — Total: ${assets.length} aset`, 14, 22);
      doc.text(`Diekspor oleh: ${user.fullName}`, 14, 27);

      // Table
      const columns = Object.keys(rows[0] ?? {});
      const data = rows.map((r: any) => columns.map((c) => r[c] ?? "-"));

      autoTable(doc, {
        head: [columns],
        body: data,
        startY: 33,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { horizontal: 14 },
      });

      const buffer = doc.output("arraybuffer");

      return new Response(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="laporan-aset-${new Date().toISOString().split("T")[0]}.pdf"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    return errorResponse("Format tidak valid. Gunakan ?format=excel atau ?format=pdf", 400);
  } catch (error: any) {
    console.error("Export error:", error);
    return errorResponse(error.message || "Gagal mengekspor laporan", 500);
  }
}
