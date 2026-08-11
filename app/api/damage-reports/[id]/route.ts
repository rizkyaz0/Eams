// app/api/damage-reports/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole, ReportStatus } from "@prisma/client";

/** PATCH /api/damage-reports/[id] - Update status / resolve */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, resolution } = body;
    const existing = await prisma.assetDamageReport.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Damage report not found");
    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status as ReportStatus;
      if (status === "RESOLVED") { updateData.resolvedAt = new Date(); updateData.resolvedById = user.userId; }
    }
    if (resolution !== undefined) updateData.resolution = resolution || null;
    const report = await prisma.assetDamageReport.update({ where: { id }, data: updateData, include: { asset: { select: { name: true, tagNumber: true } }, resolvedBy: { select: { fullName: true } } } });
    return successResponse(report, "Damage report updated");
  } catch (error) {
    console.error("Update damage report error:", error);
    return errorResponse("Failed to update damage report");
  }
}

/** DELETE /api/damage-reports/[id] */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const { id } = await params;
    const existing = await prisma.assetDamageReport.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Damage report not found");
    await prisma.assetDamageReport.delete({ where: { id } });
    return successResponse(null, "Damage report deleted");
  } catch (error) {
    console.error("Delete damage report error:", error);
    return errorResponse("Failed to delete damage report");
  }
}