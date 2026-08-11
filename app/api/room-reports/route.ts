// app/api/room-reports/route.ts
import { NextRequest } from "next/server";
import { requireRole, requireUser } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { UserRole, ReportStatus } from "@prisma/client";

/**
 * GET /api/room-reports - List room condition reports (authenticated)
 */
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");

    const reports = await prisma.roomConditionReport.findMany({
      where: {
        ...(locationId ? { locationId } : {}),
        ...(status ? { status: status as ReportStatus } : {}),
      },
      include: {
        location: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(reports);
  } catch (error) {
    console.error("Get room reports error:", error);
    return errorResponse("Failed to fetch room condition reports");
  }
}

/**
 * POST /api/room-reports - Create a room condition report (STAFF_ASSET minimum)
 */
export async function POST(request: NextRequest) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const body = await request.json();
    const { locationId, condition, description, photoPath } = body;

    if (!locationId || !condition || !description) {
      return errorResponse("Location, condition, and description are required", 400);
    }

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) return errorResponse("Location not found", 404);

    const report = await prisma.roomConditionReport.create({
      data: {
        locationId,
        reportedById: user.userId,
        condition,
        description,
        photoPath: photoPath || null,
      },
      include: {
        location: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    return successResponse(report, "Room condition report created successfully", 201);
  } catch (error) {
    console.error("Create room report error:", error);
    return errorResponse("Failed to create room condition report");
  }
}