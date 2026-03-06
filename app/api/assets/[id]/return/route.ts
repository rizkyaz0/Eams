// app/api/assets/[id]/return/route.ts
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

    // Check asset exists and is in a returnable state
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { location: true, holder: true },
    });

    if (!asset) return notFoundResponse("Aset tidak ditemukan");

    // Only IN_USE assets can be returned
    if (asset.status !== "IN_USE") {
      return errorResponse(`Pengembalian gagal: Status aset saat ini adalah "${asset.status}". Hanya aset dengan status IN_USE yang bisa dikembalikan.`, 400);
    }

    // Create returning BAST inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate BAST Number
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

      // 2. Create BAST RETURN with PENDING status
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

      // 3. Update asset status to AVAILABLE and clear holder
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          status: "AVAILABLE",
          holderId: null,
        },
      });

      return newBast;
    });

    return successResponse(result, "BAST Pengembalian berhasil dibuat dan aset dikembalikan ke status AVAILABLE.");
  } catch (error: any) {
    console.error("Return BAST error:", JSON.stringify(error, null, 2));
    return errorResponse(error.message || "Gagal membuat transaksi pengembalian", 500);
  }
}
