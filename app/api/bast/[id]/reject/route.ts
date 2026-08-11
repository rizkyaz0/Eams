import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import { rejectBastService, BastValidationError } from "@/lib/services/bast-service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/**
 * POST /api/bast/[id]/reject - Reject a BAST (thin adapter over bast-service,
 * BUG-02).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;
    const result = await rejectBastService(id, user);
    return successResponse(result);
  } catch (error) {
    if (error instanceof BastValidationError) {
      // BUG-04: creator self-rejection carries statusCode 403 (forbidden).
      return errorResponse(error.message, error.statusCode);
    }
    console.error("Reject BAST error:", error);
    return errorResponse("Failed to reject BAST", 500);
  }
}
