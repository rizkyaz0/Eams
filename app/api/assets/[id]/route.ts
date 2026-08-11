// app/api/assets/[id]/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";
import { requireRole } from "@/lib/security";
import { AssetCondition, BastType, Prisma, UserRole } from "@prisma/client";
import { createBastService, BastValidationError } from "@/lib/services/bast-service";

// Strict allow-list of editable asset fields. `z.strictObject` rejects any
// unknown key (status, imagePath, ...) with a 400. `status` is lifecycle-
// governed — it only changes through BAST approval / return / maintenance /
// disposal drafts, never directly via PATCH. `imagePath` is owned by the
// upload route (app/api/assets/[id]/images/route.ts).
const assetPatchSchema = z.strictObject({
  name: z.string().min(1).optional(),
  tagNumber: z.string().min(1).optional(),
  serialNumber: z.string().nullable().optional(),
  specification: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  categoryId: z.string().optional(),
  locationId: z.string().nullable().optional(),
  divisionId: z.string().nullable().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  vendorName: z.string().nullable().optional(),
  warrantyExpiry: z.string().nullable().optional(),
  condition: z.nativeEnum(AssetCondition).optional(),
});

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
 * PATCH /api/assets/[id] - Update editable asset fields only, validated by a
 * strict allow-list schema. `status` is lifecycle-governed (BAST approval /
 * return / maintenance / disposal drafts) and `imagePath` is owned by the
 * upload route — neither is accepted here.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

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

    // Strict allow-list validation — unknown keys (status, imagePath, ...)
    // are rejected, never silently applied.
    const parsed = assetPatchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid asset update fields", 400);
    }

    // Build update payload from validated fields only
    const updateData: Prisma.AssetUpdateInput = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.tagNumber !== undefined) updateData.tagNumber = parsed.data.tagNumber;
    if (parsed.data.serialNumber !== undefined) updateData.serialNumber = parsed.data.serialNumber;
    if (parsed.data.specification !== undefined) updateData.specification = parsed.data.specification;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.categoryId !== undefined) updateData.category = { connect: { id: parsed.data.categoryId } };
    if (parsed.data.locationId !== undefined) {
      updateData.location = parsed.data.locationId
        ? { connect: { id: parsed.data.locationId } }
        : { disconnect: true };
    }
    if (parsed.data.divisionId !== undefined) {
      updateData.division = parsed.data.divisionId
        ? { connect: { id: parsed.data.divisionId } }
        : { disconnect: true };
    }
    if (parsed.data.purchaseDate !== undefined) updateData.purchaseDate = new Date(parsed.data.purchaseDate);
    if (parsed.data.purchasePrice !== undefined) updateData.purchasePrice = parsed.data.purchasePrice;
    if (parsed.data.vendorName !== undefined) updateData.vendorName = parsed.data.vendorName;
    if (parsed.data.warrantyExpiry !== undefined) {
      updateData.warrantyExpiry = parsed.data.warrantyExpiry ? new Date(parsed.data.warrantyExpiry) : null;
    }
    if (parsed.data.condition !== undefined) updateData.condition = parsed.data.condition;

    const asset = await db.asset.update({
      where: { id },
      data: updateData,
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
 * DELETE /api/assets/[id] - Create a DISPOSAL BAST draft instead of silently
 * disposing the asset. The asset status only changes when the draft is
 * approved (bast-service DISPOSAL transition: DISPOSED + holder=null).
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;

    // Check if asset exists
    const existingAsset = await db.asset.findUnique({
      where: { id },
      include: { holder: true },
    });

    if (!existingAsset) {
      return notFoundResponse("Asset not found");
    }

    // Asset still held cannot be disposed — must be returned first.
    if (existingAsset.status === "IN_USE") {
      return errorResponse("Asset must be returned before disposal", 400);
    }

    // Create a DISPOSAL BAST draft through the consolidated service (atomic
    // numbering + PENDING status). Approval applies the DISPOSAL transition.
    const result = await createBastService(
      {
        type: BastType.DISPOSAL,
        description: `Disposal aset: ${existingAsset.name} (${existingAsset.tagNumber})`,
        recipientName: existingAsset.holder?.fullName || "-",
        recipientPosition: "Pihak Disposal",
        items: [
          {
            assetId: existingAsset.id,
            conditionBefore: existingAsset.condition,
            conditionAfter: existingAsset.condition,
          },
        ],
      },
      { userId: user.userId, fullName: user.fullName, role: user.role }
    );

    return successResponse(result, "BAST Disposal draft created successfully. Please review and approve.");
  } catch (error) {
    if (error instanceof BastValidationError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error("Delete asset error:", error);
    return errorResponse("Failed to create disposal transaction", 500);
  }
}
