import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireUser, requireRole } from "@/lib/security";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { AssetStatus, UserRole } from "@prisma/client";

/** GET /api/asset-loans/[id] - Get one batch with all items */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireUser();
  if (response) return response;

  try {
    const { id } = await params;
    const batch = await prisma.assetLoanBatch.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true } },
        items: {
          include: {
            asset: {
              select: { id: true, name: true, tagNumber: true, category: { select: { name: true } }, location: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!batch) return notFoundResponse("Data peminjaman tidak ditemukan");
    return successResponse(batch);
  } catch (error) {
    console.error("Get asset loan batch error:", error);
    return errorResponse("Gagal mengambil data peminjaman");
  }
}

/** DELETE /api/asset-loans/[id] - Delete a completed or cancelled batch */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const batch = await prisma.assetLoanBatch.findUnique({ where: { id } });
    if (!batch) return notFoundResponse("Data peminjaman tidak ditemukan");

    if (batch.status === "ACTIVE") {
      return errorResponse("Peminjaman aktif tidak dapat dihapus. Kembalikan semua aset terlebih dahulu.", 400);
    }

    await prisma.assetLoanBatch.delete({ where: { id } });
    return successResponse(null, "Data peminjaman berhasil dihapus");
  } catch (error) {
    console.error("Delete asset loan batch error:", error);
    return errorResponse("Gagal menghapus data peminjaman");
  }
}
