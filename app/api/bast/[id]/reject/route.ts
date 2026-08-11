import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;

  try {
    const { id } = await params;

    const bast = await prisma.bast.findUnique({ where: { id } });

    if (!bast) {
      return errorResponse("BAST not found", 404);
    }
    if (bast.status !== "PENDING") {
      return errorResponse("BAST is not pending", 400);
    }

    const updatedBast = await prisma.bast.update({
      where: { id },
      data: {
        status: "REJECTED",
        description: bast.description ? `${bast.description} (REJECTED)` : "REJECTED",
      },
    });

    return successResponse(updatedBast);
  } catch (error: any) {
    return errorResponse("Failed to reject BAST", 500);
  }
}
