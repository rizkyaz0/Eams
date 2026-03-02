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
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

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
