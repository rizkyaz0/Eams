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
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        description: true,
        createdAt: true,
        _count: { select: { assets: true } },
      },
      orderBy: { name: "asc" },
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
    const { name, code, address, description } = body;

    if (!name) {
      return errorResponse("Nama lokasi wajib diisi", 400);
    }

    // Check duplicate code if provided
    if (code) {
      const existingCode = await db.location.findUnique({ where: { code } });
      if (existingCode) {
        return errorResponse("Kode lokasi sudah digunakan", 409);
      }
    }

    const location = await db.location.create({
      data: { name, code: code || null, address: address || null, description: description || null },
    });

    return successResponse(location, "Lokasi berhasil dibuat", 201);
  } catch (error) {
    console.error("Create location error:", error);
    return errorResponse("Failed to create location", 500);
  }
}
