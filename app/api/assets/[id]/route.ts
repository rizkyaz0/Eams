// app/api/assets/[id]/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";
import { AssetStatus, AssetCondition } from "@prisma/client";

/**
 * GET /api/assets/[id] - Get single asset
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    const asset = await db.asset.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        holder: {
          select: {
            id: true,
            fullName: true,
            email: true,
            nip: true,
          },
        },
        division: true,
        bastDetails: {
          include: {
            bast: {
              select: {
                id: true,
                bastNumber: true,
                type: true,
                effectiveDate: true,
                creator: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            bast: {
              effectiveDate: "desc",
            },
          },
          take: 10,
        },
        maintenances: {
          orderBy: {
            startDate: "desc",
          },
          take: 10,
        },
      },
    });

    if (!asset) {
      return notFoundResponse("Asset not found");
    }

    return successResponse(asset);
  } catch (error) {
    console.error("Get asset error:", error);
    return errorResponse("Failed to fetch asset", 500);
  }
}

/**
 * PATCH /api/assets/[id] - Update asset
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Check if asset exists
    const existingAsset = await db.asset.findUnique({
      where: { id },
    });

    if (!existingAsset) {
      return notFoundResponse("Asset not found");
    }

    // Update asset
    const asset = await db.asset.update({
      where: { id },
      data: {
        name: body.name,
        tagNumber: body.tagNumber,
        serialNumber: body.serialNumber,
        specification: body.specification,
        description: body.description,
        categoryId: body.categoryId,
        locationId: body.locationId,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
        purchasePrice: body.purchasePrice,
        salvageValue: body.salvageValue ?? undefined,
        usefulLife: body.usefulLife ?? undefined,
        rfidData: body.rfidData ?? undefined,
        imagePath: body.imagePath,
        status: body.status,
        condition: body.condition,
      },
      include: {
        category: true,
        location: true,
        holder: {
          select: {
            id: true,
            fullName: true,
            email: true,
            nip: true,
          },
        },
        division: true,
      },
    });

    return successResponse(asset, "Asset updated successfully");
  } catch (error) {
    console.error("Update asset error:", error);
    return errorResponse("Failed to update asset", 500);
  }
}

/**
 * DELETE /api/assets/[id] - Delete asset
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    // Check if asset exists
    const existingAsset = await db.asset.findUnique({
      where: { id },
    });

    if (!existingAsset) {
      return notFoundResponse("Asset not found");
    }

    // Soft-Delete asset (Mark as DISPOSED)
    await db.asset.update({
      where: { id },
      data: {
        status: "DISPOSED",
        holderId: null,
      },
    });

    return successResponse(null, "Asset marked as disposed successfully");
  } catch (error) {
    console.error("Delete asset error:", error);
    return errorResponse("Failed to delete asset", 500);
  }
}
