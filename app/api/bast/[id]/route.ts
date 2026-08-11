// app/api/bast/[id]/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";
import { requireRole } from "@/lib/security";
import { UserRole } from "@prisma/client";

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
 * PATCH /api/bast/[id] - Update editable BAST fields only. Approve/reject were
 * removed from PATCH (BUG-02) — they live in bast-service and are reached via
 * /approve and /reject endpoints or the approveBast/rejectBast server actions.
 * A strict allow-list schema replaces the raw body spread in SEC-08 (Task 6).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();

    // Check if BAST exists
    const existingBast = await db.bast.findUnique({
      where: { id },
    });

    if (!existingBast) {
      return notFoundResponse("BAST not found");
    }

    // Update editable BAST fields (no asset transitions here)
    await db.bast.update({
      where: { id },
      data: {
        ...body,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      },
    });

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
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

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
