import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

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
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

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
