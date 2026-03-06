import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { BastType, AssetStatus } from "@prisma/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get BAST and include related assets to check value
      const bast = await tx.bast.findUnique({
        where: { id },
        include: {
          details: {
            include: {
              asset: true,
            },
          },
        },
      });

      if (!bast) throw new Error("BAST not found");
      if (bast.status !== "PENDING" && bast.status !== "PENDING_MGR") throw new Error("BAST is not in a pending review state");

      // Multi-Tier Workflow Engine: Calculate threshold
      const totalValue = bast.details.reduce((sum, d) => sum + Number(d.asset.purchasePrice || 0), 0);
      const HIGH_VALUE_THRESHOLD = 20000000; // Rp 20.000.000

      let targetStatus = "APPROVED";

      if (bast.status === "PENDING" && totalValue > HIGH_VALUE_THRESHOLD) {
        // If the user isn't high-ranking, push to Manager Queue
        if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN_INSTANSI") {
          targetStatus = "PENDING_MGR";
        }
      }

      // Handle intermediate hierarchy step without triggering asset automations
      if (targetStatus === "PENDING_MGR") {
        const delegatedBast = await tx.bast.update({
          where: { id },
          data: {
            status: "PENDING_MGR",
            currentApprovalLevel: 2,
          },
        });
        return { ...delegatedBast, message: "Persetujuan tahap 1 selesai. Menunggu persetujuan Manager (Aset > 20 Jt)." };
      }

      // 2. Full Approval - Update BAST target
      const updatedBast = await tx.bast.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approverId: user.id || null,
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
    return errorResponse(error.message || "Failed to approve BAST");
  }
}
