"use server";

import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BastType, AssetStatus, AssetCondition } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type CreateBastInput = {
  type: BastType;
  recipientName: string;
  recipientPosition?: string;
  description?: string;
  loanStartDate?: Date;
  loanEndDate?: Date;
  items: {
    assetId: string;
    conditionBefore?: AssetCondition;
    conditionAfter: AssetCondition;
    targetLocationId?: string;
    targetHolderId?: string;
    description?: string;
  }[];
};

/**
 * Create a new BAST (Handover Document)
 */
export async function createBast(input: CreateBastInput) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { type, recipientName, recipientPosition, description, loanStartDate, loanEndDate, items } = input;

  if (!type || !recipientName || !items || items.length === 0) {
    throw new Error("Missing required fields");
  }

  try {
    // Generate BAST Number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const existingCount = await db.bast.count({
      where: {
        createdAt: {
          gte: new Date(year, date.getMonth(), 1),
          lt: new Date(year, date.getMonth() + 1, 1),
        },
      },
    });

    const bastNumber = `BAST/${year}/${month}/${String(existingCount + 1).padStart(4, "0")}`;

    const bast = await db.$transaction(async (tx) => {
      const newBast = await tx.bast.create({
        data: {
          bastNumber,
          type,
          description,
          recipientName,
          recipientPosition,
          loanStartDate,
          loanEndDate,
          effectiveDate: new Date(),
          creatorId: user.userId,
          status: "PENDING",
        },
      });

      for (const item of items) {
        await tx.bastDetail.create({
          data: {
            bastId: newBast.id,
            assetId: item.assetId,
            conditionBefore: item.conditionBefore || AssetCondition.GOOD,
            conditionAfter: item.conditionAfter,
            targetLocationId: item.targetLocationId,
            targetHolderId: item.targetHolderId,
            description: item.description,
          },
        });
      }

      return newBast;
    });

    revalidatePath("/bast");
    return { success: true, data: bast };
  } catch (error: any) {
    console.error("Create BAST Action Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve a BAST and update asset statuses
 */
export async function approveBast(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const bast = await tx.bast.findUnique({
        where: { id },
        include: { details: true },
      });

      if (!bast) throw new Error("BAST not found");
      if (bast.status !== "PENDING") throw new Error("BAST is not pending");

      // Update Assets based on Type
      for (const detail of bast.details) {
        let updateData: any = {};

        switch (bast.type) {
          case BastType.ASSIGNMENT:
          case BastType.PROCUREMENT:
            updateData.status = AssetStatus.IN_USE;
            if (detail.targetHolderId) updateData.holderId = detail.targetHolderId;
            if (detail.targetLocationId) updateData.locationId = detail.targetLocationId;
            break;
          case BastType.RETURN:
            updateData.status = AssetStatus.AVAILABLE;
            updateData.holderId = null;
            if (detail.targetLocationId) updateData.locationId = detail.targetLocationId;
            break;
          case BastType.MUTATION:
            if (detail.targetHolderId) updateData.holderId = detail.targetHolderId;
            if (detail.targetLocationId) updateData.locationId = detail.targetLocationId;
            break;
          case BastType.MAINTENANCE_OUT:
            updateData.status = AssetStatus.IN_MAINTENANCE;
            break;
          case BastType.MAINTENANCE_IN:
            updateData.status = AssetStatus.AVAILABLE;
            break;
          case BastType.DISPOSAL:
            updateData.status = AssetStatus.DISPOSED;
            updateData.holderId = null;
            break;
        }

        // Always update condition if specified
        updateData.condition = detail.conditionAfter;

        await tx.asset.update({
          where: { id: detail.assetId },
          data: updateData,
        });
      }

      const updatedBast = await tx.bast.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approverId: user.userId,
          approverName: user.fullName,
        },
      });

      return updatedBast;
    });

    revalidatePath("/bast");
    revalidatePath(`/bast/${id}`);
    revalidatePath("/assets");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Approve BAST Action Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a BAST
 */
export async function rejectBast(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const bast = await db.bast.findUnique({ where: { id } });
    if (!bast) throw new Error("BAST not found");
    if (bast.status !== "PENDING") throw new Error("BAST is not pending");

    const updatedBast = await db.bast.update({
      where: { id },
      data: {
        status: "REJECTED",
        description: bast.description ? `${bast.description} (REJECTED)` : "REJECTED",
      },
    });

    revalidatePath("/bast");
    revalidatePath(`/bast/${id}`);
    return { success: true, data: updatedBast };
  } catch (error: any) {
    console.error("Reject BAST Action Error:", error);
    return { success: false, error: error.message };
  }
}
