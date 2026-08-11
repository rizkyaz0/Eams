import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { BastType, AssetStatus, UserRole } from "@prisma/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get BAST
      const bast = await tx.bast.findUnique({
        where: { id },
        include: { details: true },
      });

      if (!bast) throw new Error("BAST not found");
      if (bast.status !== "PENDING") throw new Error("BAST is not pending");

      // 2. Update BAST
      const updatedBast = await tx.bast.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approverId: user.userId,
          approverName: user.fullName || null,
        },
      });

      // 3. Update Assets based on Type & Additional Automation Actions
      for (const detail of bast.details) {
        let newStatus: AssetStatus = AssetStatus.AVAILABLE;
        const updateData: any = {};

        if (bast.type === BastType.ASSIGNMENT) {
          newStatus = AssetStatus.IN_USE;
          updateData.status = newStatus;
          updateData.holderId = detail.targetHolderId; // Auto transfer holder
        } else if (bast.type === BastType.RETURN) {
          newStatus = AssetStatus.AVAILABLE;
          updateData.status = newStatus;
          updateData.holderId = null; // Auto un-hold
        } else if (bast.type === BastType.MUTATION) {
          // Normalnya Mutasi memindah lokasi saja, menjaga status awal atau menjadi AVAILABLE/IN_USE tergantung bisnis, kita samakan status lamanya.
          newStatus = detail.conditionBefore ? AssetStatus.IN_USE : AssetStatus.AVAILABLE;
          updateData.status = newStatus;
          updateData.locationId = detail.targetLocationId; // Auto transfer location
        } else if (bast.type === BastType.DISPOSAL) {
          newStatus = AssetStatus.DISPOSED;
          updateData.status = newStatus;
          updateData.holderId = null; // Auto soft-delete
        } else if (bast.type === BastType.MAINTENANCE_OUT) {
          newStatus = AssetStatus.IN_MAINTENANCE;
          updateData.status = newStatus;

          // Auto create Maintenance log
          await tx.maintenance.create({
            data: {
              assetId: detail.assetId,
              description: detail.description || "Auto-generated maintenance ticket from BAST out.",
              startDate: new Date(),
              status: "IN_PROGRESS",
            },
          });
        } else {
          // Default fallback
          updateData.status = newStatus;
        }

        await tx.asset.update({
          where: { id: detail.assetId },
          data: updateData,
        });
      }

      return updatedBast;
    });

    return successResponse(result);
  } catch (error: any) {
    return errorResponse("Failed to approve BAST", 500);
  }
}
