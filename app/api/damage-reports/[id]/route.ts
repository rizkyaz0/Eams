// app/api/damage-reports/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole, ReportStatus, AssetStatus } from "@prisma/client";

/** PATCH /api/damage-reports/[id] - Update status / resolve
 *  When status → IN_PROGRESS: auto-create a Maintenance record + set asset IN_MAINTENANCE.
 *  When status → RESOLVED: mark Maintenance COMPLETED + set asset AVAILABLE.
 */
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
      if (status === "IN_PROGRESS") {
        updateData.resolvedAt = null;
        // Auto-create Maintenance record + set asset to IN_MAINTENANCE
        await prisma.$transaction(async (tx) => {
          // Check if maintenance already exists for this damage report
          const existingMaint = await tx.maintenance.findFirst({
            where: { assetId: existing.assetId, description: { contains: existing.id } },
          });
          if (!existingMaint) {
            await tx.maintenance.create({
              data: {
                assetId: existing.assetId,
                description: `Auto-created from damage report: ${existing.description} (Report ID: ${existing.id})`,
                startDate: new Date(),
                status: "IN_PROGRESS",
              },
            });
          }
          await tx.asset.update({
            where: { id: existing.assetId },
            data: { status: AssetStatus.IN_MAINTENANCE },
          });
        });
      }
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = user.userId;
        // Mark maintenance COMPLETED + set asset AVAILABLE
        await prisma.$transaction(async (tx) => {
          await tx.maintenance.updateMany({
            where: { assetId: existing.assetId, status: "IN_PROGRESS" },
            data: { status: "COMPLETED", endDate: new Date() },
          });
          const remaining = await tx.maintenance.count({
            where: { assetId: existing.assetId, status: { in: ["IN_PROGRESS", "PENDING"] } },
          });
          if (remaining === 0) {
            const activeBast = await tx.bastDetail.findFirst({
              where: { assetId: existing.assetId, bast: { status: "APPROVED" } },
            });
            await tx.asset.update({
              where: { id: existing.assetId },
              data: { status: activeBast ? AssetStatus.IN_USE : AssetStatus.AVAILABLE, condition: existing.condition },
            });
          }
        });
      }
    }
    if (resolution !== undefined) updateData.resolution = resolution || null;
    const report = await prisma.assetDamageReport.update({
      where: { id },
      data: updateData,
      include: { asset: { select: { name: true, tagNumber: true } }, resolvedBy: { select: { fullName: true } } },
    });
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