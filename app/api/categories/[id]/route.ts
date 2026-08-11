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
    const { name } = body;

    if (!name) return errorResponse("Name is required", 400);

    // Check if name exists (unique)
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        NOT: { id },
      },
    });

    if (existing) return errorResponse("Category name already exists", 409);

    const category = await prisma.category.update({
      where: { id },
      data: { name },
    });

    return successResponse(category);
  } catch (error: any) {
    if (error.code === "P2002") {
      // Unique constraint
      return errorResponse("Category name already exists", 409);
    }
    return errorResponse("Failed to update category");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;

    // Check usage
    const usageCount = await prisma.asset.count({
      where: { categoryId: id },
    });

    if (usageCount > 0) {
      return errorResponse(`Cannot delete category. It is used by ${usageCount} assets.`, 400);
    }

    await prisma.category.delete({
      where: { id },
    });

    return successResponse(null, "Category deleted successfully");
  } catch (error: any) {
    return errorResponse("Failed to delete category");
  }
}
