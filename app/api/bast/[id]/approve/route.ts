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
          approverId: user.id,
          approverName: user.fullName,
        },
      });

      // 3. Update Assets based on Type
      for (const detail of bast.details) {
        let newStatus = AssetStatus.AVAILABLE;
        const updateData: any = {};

        if (bast.type === BastType.ASSIGNMENT) {
          newStatus = AssetStatus.IN_USE;
          updateData.status = newStatus;
        } else if (bast.type === BastType.RETURN) {
          newStatus = AssetStatus.AVAILABLE;
          updateData.status = newStatus;
          updateData.holderId = null;
        } else if (bast.type === BastType.DISPOSAL) {
          newStatus = AssetStatus.DISPOSED;
          updateData.status = newStatus;
          updateData.holderId = null;
        } else if (bast.type === BastType.MAINTENANCE_OUT) {
          newStatus = AssetStatus.IN_MAINTENANCE;
          updateData.status = newStatus;
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
