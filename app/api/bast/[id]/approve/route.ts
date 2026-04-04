// app/api/bast/[id]/approve/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser, hasMinimumRole } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * POST /api/bast/[id]/approve
 *
 * Digunakan oleh User Serah atau User Terima untuk menyetujui BAST.
 * Body: { pihak: "serah" | "terima" }
 *
 * Logika:
 *  - Validasi user yang login adalah pihak yang sesuai
 *  - Update statusSerah atau statusTerima → "APPROVED"
 *  - Jika keduanya sudah APPROVED → set status BAST = "APPROVED" dan tandai approvedAt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { pihak } = body; // "serah" | "terima"

    if (!pihak || !["serah", "terima"].includes(pihak)) {
      return errorResponse("Parameter 'pihak' harus 'serah' atau 'terima'", 400);
    }

    // Ambil data BAST
    const bast = await db.bast.findUnique({
      where: { id },
      include: {
        userSerah: { select: { id: true, fullName: true } },
        userTerima: { select: { id: true, fullName: true } },
      },
    });

    if (!bast) return notFoundResponse("BAST tidak ditemukan");

    // Pastikan BAST masih bisa diapprove (status PENDING)
    if (bast.status === "APPROVED") {
      return errorResponse("BAST ini sudah disetujui oleh kedua pihak", 400);
    }

    if (bast.status === "DRAFT") {
      return errorResponse("BAST masih dalam status Draft, belum bisa diapprove", 400);
    }

    // Validasi user adalah pihak yang sesuai
    if (pihak === "serah") {
      if (!bast.userSerahId) {
        return errorResponse("BAST ini tidak memiliki User Serah yang ditentukan", 400);
      }
      if (bast.userSerahId !== user.userId) {
        return forbiddenResponse("Anda bukan User Serah pada BAST ini");
      }
      if (bast.statusSerah === "APPROVED") {
        return errorResponse("Anda sudah menyetujui BAST ini sebagai pihak penyerah", 400);
      }
    } else {
      // pihak === "terima"
      if (!bast.userTerimaId) {
        return errorResponse("BAST ini tidak memiliki User Terima yang ditentukan", 400);
      }
      if (bast.userTerimaId !== user.userId) {
        return forbiddenResponse("Anda bukan User Terima pada BAST ini");
      }
      if (bast.statusTerima === "APPROVED") {
        return errorResponse("Anda sudah menyetujui BAST ini sebagai pihak penerima", 400);
      }
    }

    // Hitung status baru setelah approve ini
    const newStatusSerah  = pihak === "serah"  ? "APPROVED" : bast.statusSerah;
    const newStatusTerima = pihak === "terima" ? "APPROVED" : bast.statusTerima;
    const bothApproved = newStatusSerah === "APPROVED" && newStatusTerima === "APPROVED";

    // Update BAST
    const updated = await db.bast.update({
      where: { id },
      data: {
        statusSerah:  newStatusSerah,
        statusTerima: newStatusTerima,
        // Jika kedua pihak sudah approved → set status BAST = APPROVED
        ...(bothApproved && {
          status:     "APPROVED",
          approvedAt: new Date(),
        }),
      },
      include: {
        userSerah:  { select: { id: true, fullName: true, lembaga: true } },
        userTerima: { select: { id: true, fullName: true, lembaga: true } },
        creator:    { select: { id: true, fullName: true } },
      },
    });

    const message = bothApproved
      ? "BAST telah disetujui oleh kedua pihak"
      : `Persetujuan sebagai pihak ${pihak === "serah" ? "penyerah" : "penerima"} berhasil`;

    return successResponse(updated, message);
  } catch (error) {
    console.error("Approve BAST error:", error);
    return errorResponse("Gagal memproses persetujuan BAST", 500);
  }
}
