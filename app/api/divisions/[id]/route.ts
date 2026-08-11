// app/api/divisions/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * PATCH /api/divisions/[id] - Update division code/name/description
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { code, name, description } = body;

    if (!code || !name) return errorResponse("Division code and name are required", 400);

    // Check code collision on other divisions
    const existing = await prisma.division.findFirst({
      where: { code, NOT: { id } },
    });

    if (existing) {
      return errorResponse("Division with this code already exists", 409);
    }

    const division = await prisma.division.update({
      where: { id },
      data: { code, name, description: description || null },
    });

    return successResponse(division, "Division updated successfully");
  } catch (error) {
    console.error("Update division error:", error);
    return errorResponse("Failed to update division");
  }
}

/**
 * DELETE /api/divisions/[id] - Delete division if unused
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;

    // Check usage
    const [userCount, assetCount] = await Promise.all([
      prisma.user.count({ where: { divisionId: id } }),
      prisma.asset.count({ where: { divisionId: id } }),
    ]);

    if (userCount > 0 || assetCount > 0) {
      const parts: string[] = [];
      if (userCount > 0) parts.push(`${userCount} users`);
      if (assetCount > 0) parts.push(`${assetCount} assets`);
      return errorResponse(`Cannot delete division. It is used by ${parts.join(" and ")}.`, 400);
    }

    await prisma.division.delete({
      where: { id },
    });

    return successResponse(null, "Division deleted successfully");
  } catch (error) {
    console.error("Delete division error:", error);
    return errorResponse("Failed to delete division");
  }
}
