// app/api/room-usage/route.ts
import { NextRequest } from "next/server";
import { requireRole, requireUser } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * GET /api/room-usage - List room usage logs (authenticated)
 */
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    const logs = await prisma.roomUsageLog.findMany({
      where: locationId ? { locationId } : undefined,
      include: {
        location: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { startTime: "desc" },
    });

    return successResponse(logs);
  } catch (error) {
    console.error("Get room usage logs error:", error);
    return errorResponse("Failed to fetch room usage logs");
  }
}

/**
 * POST /api/room-usage - Create a room usage log (STAFF_ASSET minimum)
 */
export async function POST(request: NextRequest) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const body = await request.json();
    const { locationId, purpose, notes, photoPath } = body;

    if (!locationId || !purpose) {
      return errorResponse("Location and purpose are required", 400);
    }

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) return errorResponse("Location not found", 404);

    const log = await prisma.roomUsageLog.create({
      data: {
        locationId,
        userId: user.userId,
        purpose,
        notes: notes || null,
        photoPath: photoPath || null,
      },
      include: {
        location: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    return successResponse(log, "Room usage log created successfully", 201);
  } catch (error) {
    console.error("Create room usage log error:", error);
    return errorResponse("Failed to create room usage log");
  }
}