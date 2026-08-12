import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/security";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { AssetStatus, UserRole } from "@prisma/client";

/** PATCH /api/asset-loans/[id]/items/[itemId] - Return a single asset from a batch */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id: batchId, itemId } = await params;
    const body = await request.json();
    const { actualReturnDate, notes } = body;

    const item = await prisma.assetLoanItem.findUnique({
      where: { id: itemId },
      include: { batch: true },
    });

    if (!item) return notFoundResponse("Item peminjaman tidak ditemukan");
    if (item.batchId !== batchId) return errorResponse("Item tidak sesuai dengan batch", 400);
    if (item.status === "RETURNED") return errorResponse("Aset sudah dikembalikan", 400);

    const returnDate = actualReturnDate ? new Date(actualReturnDate) : new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.assetLoanItem.update({
        where: { id: itemId },
        data: { status: "RETURNED", actualReturnDate: returnDate, notes: notes ?? item.notes },
        include: { asset: { select: { id: true, name: true, tagNumber: true } } },
      });

      // Restore asset status
      const activeBast = await tx.bastDetail.findFirst({
        where: { assetId: item.assetId, bast: { status: "APPROVED" } },
      });
      await tx.asset.update({
        where: { id: item.assetId },
        data: { status: activeBast ? AssetStatus.IN_USE : AssetStatus.AVAILABLE },
      });

      // Check if all items in the batch are returned → mark batch COMPLETED
      const remainingActive = await tx.assetLoanItem.count({
        where: { batchId, status: { in: ["ACTIVE", "OVERDUE"] } },
      });
      if (remainingActive === 0) {
        await tx.assetLoanBatch.update({
          where: { id: batchId },
          data: { status: "COMPLETED" },
        });
      }

      return updatedItem;
    });

    return successResponse(updated, "Aset berhasil dikembalikan");
  } catch (error) {
    console.error("Return asset loan item error:", error);
    return errorResponse("Gagal mengembalikan aset");
  }
}
