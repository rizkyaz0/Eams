// app/api/procurement/route.ts
import { NextRequest } from "next/server";
import { requireRole, requireUser } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { UserRole, ProcurementStatus } from "@prisma/client";

/** GET /api/procurement */
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const reqs = await prisma.procurementRequest.findMany({
      where: status ? { status: status as ProcurementStatus } : undefined,
      include: {
        maintenance: { select: { id: true, description: true, asset: { select: { name: true, tagNumber: true } } } },
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(reqs);
  } catch (error) {
    console.error("Get procurement error:", error);
    return errorResponse("Failed to fetch procurement requests");
  }
}

/** POST /api/procurement */
export async function POST(request: NextRequest) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const body = await request.json();
    const { maintenanceId, itemName, quantity, unit, estimatedPrice, supplier, notes } = body;
    if (!itemName) return errorResponse("Item name is required", 400);
    const req = await prisma.procurementRequest.create({
      data: {
        maintenanceId: maintenanceId || null,
        itemName,
        quantity: quantity || 1,
        unit: unit || null,
        estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : null,
        supplier: supplier || null,
        notes: notes || null,
        requestedById: user.userId,
      },
      include: { requestedBy: { select: { fullName: true } } },
    });
    return successResponse(req, "Procurement request created", 201);
  } catch (error) {
    console.error("Create procurement error:", error);
    return errorResponse("Failed to create procurement request");
  }
}