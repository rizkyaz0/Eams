import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/security";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { AssetStatus, UserRole } from "@prisma/client";

/** PATCH /api/asset-loans/[id] - Update loan (return asset or mark overdue) */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, actualReturnDate } = body;

    const loan = await prisma.assetLoan.findUnique({ where: { id } });
    if (!loan) return notFoundResponse("Data peminjaman tidak ditemukan");

    if (loan.status === "RETURNED") {
      return errorResponse("Aset sudah dikembalikan", 400);
    }

    if (status === "RETURNED") {
      const returnDate = actualReturnDate ? new Date(actualReturnDate) : new Date();

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.assetLoan.update({
          where: { id },
          data: { status: "RETURNED", actualReturnDate: returnDate, notes: notes ?? loan.notes },
          include: { asset: { select: { id: true, name: true, tagNumber: true } } },
        });

        const activeBast = await tx.bastDetail.findFirst({
          where: { assetId: loan.assetId, bast: { status: "APPROVED" } },
        });

        await tx.asset.update({
          where: { id: loan.assetId },
          data: { status: activeBast ? AssetStatus.IN_USE : AssetStatus.AVAILABLE },
        });

        return result;
      });

      return successResponse(updated, "Aset berhasil dikembalikan");
    }

    const updated = await prisma.assetLoan.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: { asset: { select: { id: true, name: true, tagNumber: true } } },
    });

    return successResponse(updated, "Peminjaman berhasil diperbarui");
  } catch (error) {
    console.error("Update asset loan error:", error);
    return errorResponse("Gagal memperbarui peminjaman");
  }
}

/** DELETE /api/asset-loans/[id] - Delete a returned loan record */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const loan = await prisma.assetLoan.findUnique({ where: { id } });
    if (!loan) return notFoundResponse("Data peminjaman tidak ditemukan");

    if (loan.status !== "RETURNED") {
      return errorResponse("Hanya peminjaman yang sudah dikembalikan yang dapat dihapus", 400);
    }

    await prisma.assetLoan.delete({ where: { id } });
    return successResponse(null, "Data peminjaman berhasil dihapus");
  } catch (error) {
    console.error("Delete asset loan error:", error);
    return errorResponse("Gagal menghapus data peminjaman");
  }
}
