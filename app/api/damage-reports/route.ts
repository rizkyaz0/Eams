// app/api/damage-reports/route.ts
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { UserRole, ReportStatus } from "@prisma/client";

/** GET /api/damage-reports */
export async function GET(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = status ? { status: status as ReportStatus } : {};
    // MR sees only damage reports for their division's assets
    if (user.role === UserRole.MR) {
      where.asset = { divisionId: user.divisionId ?? "NO_DIVISION_ASSIGNED" };
    }

    const reports = await prisma.assetDamageReport.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, tagNumber: true } },
        reportedBy: { select: { id: true, fullName: true } },
        resolvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(reports);
  } catch (error) {
    console.error("Get damage reports error:", error);
    return errorResponse("Failed to fetch damage reports");
  }
}

/** POST /api/damage-reports */
export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  try {
    const body = await request.json();
    const { assetId, condition, description, photoPath } = body;
    if (!assetId || !condition || !description) return errorResponse("Asset, condition, and description are required", 400);
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return errorResponse("Asset not found", 404);
    const report = await prisma.assetDamageReport.create({
      data: { assetId, reportedById: user.userId, condition, description, photoPath: photoPath || null },
      include: { asset: { select: { id: true, name: true, tagNumber: true } }, reportedBy: { select: { fullName: true } } },
    });
    return successResponse(report, "Damage report created", 201);
  } catch (error) {
    console.error("Create damage report error:", error);
    return errorResponse("Failed to create damage report");
  }
}