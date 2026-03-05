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
      include: {
        location: true,
        holder: true,
      },
    });

    if (!asset) return notFoundResponse("Asset not found");
    if (asset.status !== "IN_USE") return errorResponse("Asset is not currently in use", 400);

    // Create a returning BAST
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate Next BAST Number
      const lastBast = await tx.bast.findFirst({
        where: { type: BastType.RETURN },
        orderBy: { createdAt: "desc" },
      });

      const nextNumber = lastBast ? parseInt(lastBast.bastNumber.split("-")[2]) + 1 : 1;
      const bastNumber = `BAST-RTN-${nextNumber.toString().padStart(4, "0")}`;

      // 2. Create BAST with DRAFT status
      const newBast = await tx.bast.create({
        data: {
          bastNumber,
          type: BastType.RETURN,
          description: `Pengembalian otomatis aset: ${asset.name}`,
          status: "DRAFT",
          effectiveDate: new Date(),
          recipientName: asset.holder?.fullName || "Previous Holder",
          recipientPosition: "Employee",
          creatorId: user.id,
          details: {
            create: [
              {
                assetId: asset.id,
                conditionBefore: asset.condition,
                conditionAfter: asset.condition,
                targetLocationId: asset.locationId, // Return to original location
              },
            ],
          },
        },
      });

      return newBast;
    });

    return successResponse(result, "BAST Return draft created successfully. Please review and approve.");
  } catch (error: any) {
    console.error("Return BAST auto-generation error:", error);
    return errorResponse(error.message || "Failed to generate return transaction", 500);
  }
}
