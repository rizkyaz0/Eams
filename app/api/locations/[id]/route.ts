import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, address, description } = body;

    if (!name) return errorResponse("Name is required", 400);

    const location = await prisma.location.update({
      where: { id },
      data: { name, address, description },
    });

    return successResponse(location);
  } catch (error: any) {
    return errorResponse("Failed to update location");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;

    // Check usage
    const usageCount = await prisma.asset.count({
      where: { locationId: id },
    });

    if (usageCount > 0) {
      return errorResponse(`Cannot delete location. It is used by ${usageCount} assets.`, 400);
    }

    await prisma.location.delete({
      where: { id },
    });

    return successResponse(null, "Location deleted successfully");
  } catch (error: any) {
    return errorResponse("Failed to delete location");
  }
}
