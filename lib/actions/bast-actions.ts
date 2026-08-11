"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { requireRoleOrThrow } from "@/lib/security";
import {
  createBastService,
  approveBastService,
  rejectBastService,
  BastValidationError,
  type CreateBastInput,
} from "@/lib/services/bast-service";

export type { CreateBastInput } from "@/lib/services/bast-service";
export type { BastActor } from "@/lib/services/bast-service";

// BAST mutations require at least STAFF_ASSET (SEC-07 role matrix).
const BAST_MUTATION_ROLE = UserRole.STAFF_ASSET;

/**
 * Thin adapter — Create a new BAST (Handover Document). Delegates all business
 * logic to bast-service (BUG-02); keeps the `{ success, data }` envelope,
 * revalidatePath, and the "Unauthorized" throw contract (R4).
 */
export async function createBast(input: CreateBastInput) {
  const user = await requireRoleOrThrow(BAST_MUTATION_ROLE);

  try {
    const bast = await createBastService(input, user);
    revalidatePath("/bast");
    return { success: true, data: bast };
  } catch (error) {
    if (error instanceof BastValidationError) {
      return { success: false, error: error.message };
    }
    console.error("Create BAST Action Error:", error);
    return { success: false, error: "Failed to create BAST" };
  }
}

/**
 * Thin adapter — Approve a BAST and update asset statuses via the service
 * transition table.
 */
export async function approveBast(id: string) {
  const user = await requireRoleOrThrow(BAST_MUTATION_ROLE);

  try {
    const result = await approveBastService(id, user);
    revalidatePath("/bast");
    revalidatePath(`/bast/${id}`);
    revalidatePath("/assets");
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BastValidationError) {
      return { success: false, error: error.message };
    }
    console.error("Approve BAST Action Error:", error);
    return { success: false, error: "Failed to approve BAST" };
  }
}

/**
 * Thin adapter — Reject a BAST via the service.
 */
export async function rejectBast(id: string) {
  const user = await requireRoleOrThrow(BAST_MUTATION_ROLE);

  try {
    const result = await rejectBastService(id, user);
    revalidatePath("/bast");
    revalidatePath(`/bast/${id}`);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BastValidationError) {
      return { success: false, error: error.message };
    }
    console.error("Reject BAST Action Error:", error);
    return { success: false, error: "Failed to reject BAST" };
  }
}
