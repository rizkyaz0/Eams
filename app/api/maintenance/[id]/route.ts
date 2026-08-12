import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api-response";
import { requireRole } from "@/lib/security";
import { AssetStatus, UserRole } from "@prisma/client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        asset: true,
      },
    });

    if (!maintenance) return notFoundResponse("Maintenance record not found");

    return successResponse(maintenance);
  } catch (error) {
    console.error("Failed to fetch maintenance:", error);
    return errorResponse("Failed to fetch maintenance record");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, cost, description, vendorName, startDate, endDate } = body;

    const currentMaintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!currentMaintenance) return notFoundResponse("Maintenance record not found");

    const maintenance = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenance.update({
        where: { id },
        data: {
          status,
          cost,
          description,
          vendorName,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : null,
        },
      });

      // Update asset status based on maintenance status
      if (status === "IN_PROGRESS" && currentMaintenance.assetId) {
        await tx.asset.update({
          where: { id: currentMaintenance.assetId },
          data: { status: AssetStatus.IN_MAINTENANCE },
        });
      } else if (status === "COMPLETED" && currentMaintenance.assetId) {
        const otherActive = await tx.maintenance.count({
          where: { assetId: currentMaintenance.assetId, id: { not: id }, status: { in: ["IN_PROGRESS", "PENDING"] } },
        });
        if (otherActive === 0) {
          await tx.asset.update({
            where: { id: currentMaintenance.assetId },
            data: { status: AssetStatus.AVAILABLE },
          });
        }
      }

      return updated;
    });

    return successResponse(maintenance);
  } catch (error) {
    console.error("Failed to update maintenance:", error);
    return errorResponse("Failed to update maintenance record");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const currentMaintenance = await prisma.maintenance.findUnique({
      where: { id },
    });

    if (!currentMaintenance) return notFoundResponse("Maintenance record not found");

    await prisma.$transaction(async (tx) => {
      // If deleting an ongoing maintenance, revert asset status
      if (currentMaintenance.status === "IN_PROGRESS" || currentMaintenance.status === "PENDING") {
        const otherActive = await tx.maintenance.count({
          where: { assetId: currentMaintenance.assetId, id: { not: currentMaintenance.id }, status: { in: ["IN_PROGRESS", "PENDING"] } },
        });
        if (otherActive === 0) {
          await tx.asset.update({
            where: { id: currentMaintenance.assetId },
            data: { status: AssetStatus.AVAILABLE },
          });
        }
      }

      await tx.maintenance.delete({
        where: { id },
      });
    });

    return successResponse({ message: "Maintenance record deleted" });
  } catch (error) {
    console.error("Failed to delete maintenance:", error);
    return errorResponse("Failed to delete maintenance record");
  }
}
