// app/api/locations/route.ts
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

/**
 * GET /api/locations - Get all locations
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const locations = await db.location.findMany({
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return successResponse(locations);
  } catch (error) {
    console.error("Get locations error:", error);
    return errorResponse("Failed to fetch locations", 500);
  }
}

/**
 * POST /api/locations - Create new location
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { name, address, description } = body;

    if (!name) {
      return errorResponse("Location name is required", 400);
    }

    const location = await db.location.create({
      data: {
        name,
        address: address || null,
        description: description || null,
      },
    });

    return successResponse(location, "Location created successfully", 201);
  } catch (error) {
    console.error("Create location error:", error);
    return errorResponse("Failed to create location", 500);
  }
}
