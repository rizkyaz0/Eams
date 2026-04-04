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
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        createdAt: true,
        _count: { select: { assets: true } },
      },
      orderBy: { name: "asc" },
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
    const { name, code, description } = body;

    if (!name) {
      return errorResponse("Nama kategori wajib diisi", 400);
    }

    // Check duplicate name
    const existingName = await db.category.findUnique({ where: { name } });
    if (existingName) {
      return errorResponse("Kategori dengan nama ini sudah ada", 409);
    }

    // Check duplicate code if provided
    if (code) {
      const existingCode = await db.category.findUnique({ where: { code } });
      if (existingCode) {
        return errorResponse("Kode kategori sudah digunakan", 409);
      }
    }

    const category = await db.category.create({
      data: { name, code: code || null, description: description || null },
    });

    return successResponse(category, "Kategori berhasil dibuat", 201);
  } catch (error) {
    console.error("Create category error:", error);
    return errorResponse("Failed to create category", 500);
  }
}
