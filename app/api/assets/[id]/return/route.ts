// app/api/assets/[id]/return/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { errorResponse, successResponse, notFoundResponse } from "@/lib/api-response";
import { BastType, UserRole } from "@prisma/client";
import { createBastService, BastValidationError } from "@/lib/services/bast-service";

/**
 * POST /api/assets/[id]/return - Auto-generate a RETURN BAST draft for an
 * in-use asset. Delegates to bast-service so numbering is atomic
 * (BAST/YYYY/MM/NNNN via counter + FOR UPDATE) and the RETURN transition
 * table applies on later approval (Gap 1, BUG-02/03).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

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

    // Create a returning BAST through the consolidated service: atomic
    // numbering + PENDING status (approvable) + legal RETURN transitions.
    const result = await createBastService(
      {
        type: BastType.RETURN,
        description: `Pengembalian otomatis aset: ${asset.name}`,
        recipientName: asset.holder?.fullName || "Previous Holder",
        recipientPosition: "Employee",
        items: [
          {
            assetId: asset.id,
            conditionBefore: asset.condition,
            conditionAfter: asset.condition,
            targetLocationId: asset.locationId ?? undefined, // Return to original location
          },
        ],
      },
      { userId: user.userId, fullName: user.fullName, role: user.role }
    );

    return successResponse(result, "BAST Return draft created successfully. Please review and approve.");
  } catch (error) {
    if (error instanceof BastValidationError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error("Return BAST auto-generation error:", error);
    return errorResponse("Failed to generate return transaction", 500);
  }
}
