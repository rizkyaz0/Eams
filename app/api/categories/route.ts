// app/api/categories/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

/**
 * GET /api/categories - Get all categories
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const categories = await db.category.findMany({
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return successResponse(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    return errorResponse("Failed to fetch categories", 500);
  }
}

/**
 * POST /api/categories - Create new category
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return errorResponse("Category name is required", 400);
    }

    // Check if category already exists
    const existingCategory = await db.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      return errorResponse("Category with this name already exists", 409);
    }

    const category = await db.category.create({
      data: { name },
    });

    return successResponse(category, "Category created successfully", 201);
  } catch (error) {
    console.error("Create category error:", error);
    return errorResponse("Failed to create category", 500);
  }
}
