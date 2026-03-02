import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    console.log("Rejecting BAST ID:", id);

    const bast = await prisma.bast.findUnique({ where: { id } });
    console.log("Found BAST:", bast);

    if (!bast) {
      console.log("BAST not found via prisma");
      return errorResponse("BAST not found", 404);
    }
    if (bast.status !== "PENDING") {
      console.log("BAST not pending:", bast.status);
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
    return errorResponse(error.message || "Failed to reject BAST");
  }
}
