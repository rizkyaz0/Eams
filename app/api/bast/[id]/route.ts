// app/api/bast/[id]/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";
import { requireRole } from "@/lib/security";
import { Prisma, UserRole } from "@prisma/client";

// SEC-08: strict allow-list of editable BAST fields. `z.strictObject` rejects
// any unknown key (status, bastNumber, type, approverId, ...) with a 400 —
// attempts to move a BAST through its lifecycle via PATCH no longer silently
// apply. Lifecycle moves happen through /approve + /reject (or server actions).
const bastPatchSchema = z.strictObject({
  description: z.string().nullable().optional(),
  recipientName: z.string().nullable().optional(),
  recipientPosition: z.string().nullable().optional(),
  loanStartDate: z.string().nullable().optional(),
  loanEndDate: z.string().nullable().optional(),
  effectiveDate: z.string().optional(),
});

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
 * PATCH /api/bast/[id] - Update editable BAST fields only, validated by a
 * strict allow-list schema (SEC-08). Approve/reject live in bast-service via
 * /approve and /reject endpoints or the approveBast/rejectBast server actions.
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

    // Strict allow-list validation — unknown keys (status, bastNumber, type,
    // approverId, approvedAt, ...) are rejected, never silently applied.
    const parsed = bastPatchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid BAST update fields", 400);
    }

    // Build update payload from validated fields only
    const updateData: Prisma.BastUpdateInput = {};
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.recipientName !== undefined) updateData.recipientName = parsed.data.recipientName;
    if (parsed.data.recipientPosition !== undefined) updateData.recipientPosition = parsed.data.recipientPosition;
    if (parsed.data.loanStartDate !== undefined) updateData.loanStartDate = parsed.data.loanStartDate ? new Date(parsed.data.loanStartDate) : null;
    if (parsed.data.loanEndDate !== undefined) updateData.loanEndDate = parsed.data.loanEndDate ? new Date(parsed.data.loanEndDate) : null;
    if (parsed.data.effectiveDate !== undefined) updateData.effectiveDate = new Date(parsed.data.effectiveDate);

    await db.bast.update({
      where: { id },
      data: updateData,
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
