// app/api/room-reports/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole, ReportStatus } from "@prisma/client";

/**
 * PATCH /api/room-reports/[id] - Update report status / resolve
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, resolution } = body;

    const existing = await prisma.roomConditionReport.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Room condition report not found");

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status as ReportStatus;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = user.userId;
      }
    }
    if (resolution !== undefined) updateData.resolution = resolution || null;

    const report = await prisma.roomConditionReport.update({
      where: { id },
      data: updateData,
      include: {
        location: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true } },
      },
    });

    return successResponse(report, "Room condition report updated successfully");
  } catch (error) {
    console.error("Update room report error:", error);
    return errorResponse("Failed to update room condition report");
  }
}

/**
 * DELETE /api/room-reports/[id] - Delete a room condition report
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;

    const existing = await prisma.roomConditionReport.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Room condition report not found");

    await prisma.roomConditionReport.delete({ where: { id } });

    return successResponse(null, "Room condition report deleted successfully");
  } catch (error) {
    console.error("Delete room report error:", error);
    return errorResponse("Failed to delete room condition report");
  }
}