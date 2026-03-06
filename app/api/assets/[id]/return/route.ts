// app/api/assets/[id]/return/route.ts - RECOMPILE TRIGGER
// Generates an automatic BAST Pengembalian (Return) in PENDING state
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

    // Check asset
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { location: true, holder: true },
    });

    if (!asset) return notFoundResponse("Aset tidak ditemukan");
    if (asset.status !== "IN_USE") return errorResponse("Aset ini tidak sedang dalam status digunakan (IN_USE)", 400);
    if (!asset.holderId) return errorResponse("Aset tidak memiliki penanggung jawab yang tercatat", 400);

    // Create a returning BAST inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate BAST Number using standard BAST/YYYY/MM/NNNN format
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      const existingCount = await tx.bast.count({
        where: {
          createdAt: {
            gte: new Date(year, date.getMonth(), 1),
            lt: new Date(year, date.getMonth() + 1, 1),
          },
        },
      });

      const bastNumber = `BAST/${year}/${month}/${String(existingCount + 1).padStart(4, "0")}`;

      // 2. Create BAST with PENDING status
      // ✅ FIXED: was user.id (undefined) — JWT payload field is `userId`
      const newBast = await tx.bast.create({
        data: {
          bastNumber,
          type: BastType.RETURN,
          description: `Pengembalian aset: ${asset.name} — dari: ${asset.holder?.fullName || "N/A"}`,
          status: "PENDING",
          effectiveDate: new Date(),
          recipientName: asset.holder?.fullName || "Penanggung Jawab Sebelumnya",
          recipientPosition: "Pemegang Aset Terakhir",
          creatorId: user.userId, // ✅ FIX: JWT payload uses 'userId', not 'id'
          details: {
            create: [
              {
                assetId: asset.id,
                conditionBefore: asset.condition,
                conditionAfter: asset.condition,
                targetLocationId: asset.locationId,
                targetHolderId: null, // No new holder after return (asset freed)
              },
            ],
          },
        },
      });

      return newBast;
    });

    return successResponse(result, "BAST Pengembalian berhasil dibuat. Silakan review dan setujui.");
  } catch (error: any) {
    console.error("Return BAST auto-generation error:", error);
    return errorResponse(error.message || "Gagal membuat transaksi pengembalian", 500);
  }
}
