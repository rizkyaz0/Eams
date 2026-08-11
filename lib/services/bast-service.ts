// lib/services/bast-service.ts
// Server-only BAST domain logic (BUG-02). REST handlers and server actions are
// thin adapters over these typed functions; the legal per-BastType asset
// transitions and approval semantics live here in exactly one place. Never
// import into client components (server-only: imports db).
import db from "@/lib/db";
import { BastType, AssetCondition, AssetStatus, UserRole, Prisma } from "@prisma/client";

/**
 * The actor performing a BAST operation — derived from the authenticated
 * session (JWTPayload), never from request body.
 */
export interface BastActor {
  userId: string;
  fullName: string;
  role: UserRole;
}

/**
 * Create input accepted by the service. `conditionAfter` is required per item;
 * all other fields are optional.
 */
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
 * Domain validation error — carries a user-safe message and an HTTP status.
 * Adapters map it to that status (REST) or `{ success: false, error }`
 * (server actions). BUG-04 creator checks throw with 403.
 */
export class BastValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "BastValidationError";
    this.statusCode = statusCode;
  }
}

/**
 * Create a BAST with its detail rows in a transaction. Generates the monthly
 * sequential BAST number and records the actor as creator.
 */
export async function createBastService(input: CreateBastInput, actor: BastActor) {
  const { type, recipientName, recipientPosition, description, loanStartDate, loanEndDate, items } = input;

  if (!type || !recipientName || !items || items.length === 0) {
    throw new BastValidationError("Missing required fields");
  }

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

  return db.$transaction(async (tx) => {
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
        creatorId: actor.userId,
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
}

/**
 * Approve a PENDING BAST and apply the per-BastType asset transition table.
 *
 * Transition table (BUG-02) — the single source of truth for approval effects:
 *
 * | BastType        | On approve: asset status | On approve: holder/location            |
 * |-----------------|--------------------------|----------------------------------------|
 * | ASSIGNMENT      | IN_USE                   | holderId=targetHolderId; locationId=targetLocationId |
 * | PROCUREMENT     | IN_USE                   | holderId=targetHolderId; locationId=targetLocationId |
 * | RETURN          | AVAILABLE                | holderId=null; locationId=targetLocationId |
 * | MUTATION        | unchanged                | holderId=targetHolderId; locationId=targetLocationId |
 * | MAINTENANCE_OUT | IN_MAINTENANCE           | — (auto-creates Maintenance ticket)    |
 * | MAINTENANCE_IN  | AVAILABLE                | —                                       |
 * | DISPOSAL        | DISPOSED                 | holderId=null                           |
 *
 * Divergence resolutions (R2):
 * - MUTATION: REST set status from `conditionBefore` truthiness; server action
 *   kept the current status. Chosen: status is preserved — a mutation relocates
 *   the asset, it does not change its lifecycle status. REST behavior dropped.
 * - MAINTENANCE_OUT: REST auto-created a Maintenance ticket; the server action
 *   did not. Chosen: keep the REST behavior (the richer one) — the ticket is
 *   created here inside the transaction.
 * - conditionAfter is always written to the asset's condition on approval
 *   (both implementations did this).
 */
export async function approveBastService(id: string, actor: BastActor) {
  return db.$transaction(async (tx) => {
    const bast = await tx.bast.findUnique({
      where: { id },
      include: { details: true },
    });

    if (!bast) throw new BastValidationError("BAST not found");
    if (bast.status !== "PENDING") throw new BastValidationError("BAST is not pending");

    // Separation of duties (BUG-04): the creator cannot approve their own BAST.
    if (bast.creatorId === actor.userId) {
      throw new BastValidationError("Creator cannot approve their own BAST", 403);
    }

    for (const detail of bast.details) {
      const updateData: Prisma.AssetUncheckedUpdateInput = {};

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
          // R2: preserve the current asset status — mutation only relocates.
          if (detail.targetHolderId) updateData.holderId = detail.targetHolderId;
          if (detail.targetLocationId) updateData.locationId = detail.targetLocationId;
          break;
        case BastType.MAINTENANCE_OUT:
          updateData.status = AssetStatus.IN_MAINTENANCE;
          // Auto-create maintenance ticket (kept from REST approve behavior).
          await tx.maintenance.create({
            data: {
              assetId: detail.assetId,
              description: detail.description || "Auto-generated maintenance ticket from BAST out.",
              startDate: new Date(),
              status: "IN_PROGRESS",
            },
          });
          break;
        case BastType.MAINTENANCE_IN:
          updateData.status = AssetStatus.AVAILABLE;
          break;
        case BastType.DISPOSAL:
          updateData.status = AssetStatus.DISPOSED;
          updateData.holderId = null;
          break;
        default:
          // STOCK_OPNAME (and any future type): no asset transition — condition only.
          break;
      }

      updateData.condition = detail.conditionAfter;

      await tx.asset.update({
        where: { id: detail.assetId },
        data: updateData,
      });
    }

    return tx.bast.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approverId: actor.userId,
        approverName: actor.fullName,
      },
    });
  });
}

/**
 * Reject a PENDING BAST by appending "(REJECTED)" to its description.
 */
export async function rejectBastService(id: string, actor: BastActor) {
  const bast = await db.bast.findUnique({ where: { id } });

  if (!bast) throw new BastValidationError("BAST not found");
  if (bast.status !== "PENDING") throw new BastValidationError("BAST is not pending");

  // Separation of duties (BUG-04): the creator cannot reject their own BAST.
  if (bast.creatorId === actor.userId) {
    throw new BastValidationError("Creator cannot reject their own BAST", 403);
  }

  return db.bast.update({
    where: { id },
    data: {
      status: "REJECTED",
      description: bast.description ? `${bast.description} (REJECTED)` : "REJECTED",
    },
  });
}
