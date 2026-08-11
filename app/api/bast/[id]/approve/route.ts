import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import { approveBastService, BastValidationError } from "@/lib/services/bast-service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * POST /api/bast/[id]/approve - Approve a BAST (thin adapter over bast-service,
 * BUG-02). Asset transitions follow the per-BastType table in the service.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const result = await approveBastService(id, user);
    return successResponse(result);
  } catch (error) {
    if (error instanceof BastValidationError) {
      return errorResponse(error.message, 400);
    }
    console.error("Approve BAST error:", error);
    return errorResponse("Failed to approve BAST", 500);
  }
}
