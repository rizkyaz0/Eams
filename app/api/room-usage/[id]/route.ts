// app/api/room-usage/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * PATCH /api/room-usage/[id] - End a room usage session (set endTime)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { endTime, notes } = body;

    const existing = await prisma.roomUsageLog.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Room usage log not found");

    const log = await prisma.roomUsageLog.update({
      where: { id },
      data: {
        endTime: endTime ? new Date(endTime) : new Date(),
        notes: notes !== undefined ? notes : existing.notes,
      },
      include: {
        location: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    return successResponse(log, "Room usage session ended successfully");
  } catch (error) {
    console.error("Update room usage log error:", error);
    return errorResponse("Failed to update room usage log");
  }
}

/**
 * DELETE /api/room-usage/[id] - Delete a room usage log
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;

    const existing = await prisma.roomUsageLog.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Room usage log not found");

    await prisma.roomUsageLog.delete({ where: { id } });

    return successResponse(null, "Room usage log deleted successfully");
  } catch (error) {
    console.error("Delete room usage log error:", error);
    return errorResponse("Failed to delete room usage log");
  }
}