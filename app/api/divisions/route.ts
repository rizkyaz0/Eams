// app/api/divisions/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

/**
 * GET /api/divisions - Get all divisions
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const divisions = await db.division.findMany({
      include: {
        _count: {
          select: { users: true, assets: true },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    return successResponse(divisions);
  } catch (error) {
    console.error("Get divisions error:", error);
    return errorResponse("Failed to fetch divisions", 500);
  }
}

/**
 * POST /api/divisions - Create new division
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { code, name, description } = body;

    if (!code || !name) {
      return errorResponse("Division code and name are required", 400);
    }

    // Check if division code already exists
    const existingDivision = await db.division.findUnique({
      where: { code },
    });

    if (existingDivision) {
      return errorResponse("Division with this code already exists", 409);
    }

    const division = await db.division.create({
      data: {
        code,
        name,
        description: description || null,
      },
    });

    return successResponse(division, "Division created successfully", 201);
  } catch (error) {
    console.error("Create division error:", error);
    return errorResponse("Failed to create division", 500);
  }
}
