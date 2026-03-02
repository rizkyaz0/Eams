// app/api/bast/[id]/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";

/**
 * GET /api/bast/[id] - Get single BAST with full details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    const bast = await db.bast.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            nip: true,
            division: true,
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
            email: true,
            nip: true,
            division: true,
          },
        },
        details: {
          include: {
            asset: {
              include: {
                category: true,
                location: true,
                holder: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!bast) {
      return notFoundResponse("BAST not found");
    }

    return successResponse(bast);
  } catch (error) {
    console.error("Get BAST error:", error);
    return errorResponse("Failed to fetch BAST", 500);
  }
}

/**
 * PATCH /api/bast/[id] - Update BAST (e.g., approve, reject)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Check if BAST exists
    const existingBast = await db.bast.findUnique({
      where: { id },
      include: {
        details: true,
      },
    });

    if (!existingBast) {
      return notFoundResponse("BAST not found");
    }

    // If approving BAST, update all related assets
    if (body.status === "APPROVED" && existingBast.status !== "APPROVED") {
      await db.$transaction(async (tx) => {
        // Update BAST
        await tx.bast.update({
          where: { id },
          data: {
            ...body,
            approverId: user.userId,
            effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
          },
        });

        // Update all assets in BAST details
        await Promise.all(
          existingBast.details.map(async (detail) => {
            const updateData: any = {
              condition: detail.conditionAfter,
            };

            if (detail.targetLocationId) {
              updateData.locationId = detail.targetLocationId;
            }

            if (detail.targetHolderId) {
              updateData.holderId = detail.targetHolderId;
              updateData.status = "IN_USE";
            }

            return tx.asset.update({
              where: { id: detail.assetId },
              data: updateData,
            });
          }),
        );
      });
    } else {
      // Just update BAST without asset changes
      await db.bast.update({
        where: { id },
        data: {
          ...body,
          effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
        },
      });
    }

    // Fetch updated BAST
    const updatedBast = await db.bast.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        details: {
          include: {
            asset: true,
          },
        },
      },
    });

    return successResponse(updatedBast, "BAST updated successfully");
  } catch (error) {
    console.error("Update BAST error:", error);
    return errorResponse("Failed to update BAST", 500);
  }
}

/**
 * DELETE /api/bast/[id] - Delete BAST (only if DRAFT)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    // Check if BAST exists
    const existingBast = await db.bast.findUnique({
      where: { id },
    });

    if (!existingBast) {
      return notFoundResponse("BAST not found");
    }

    // Only allow deletion if BAST is in DRAFT status
    if (existingBast.status !== "DRAFT") {
      return errorResponse("Cannot delete approved or processed BAST. Only DRAFT can be deleted.", 403);
    }

    // Delete BAST (cascade will delete details)
    await db.bast.delete({
      where: { id },
    });

    return successResponse(null, "BAST deleted successfully");
  } catch (error) {
    console.error("Delete BAST error:", error);
    return errorResponse("Failed to delete BAST", 500);
  }
}
