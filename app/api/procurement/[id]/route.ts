// app/api/procurement/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole, ProcurementStatus } from "@prisma/client";

/** PATCH /api/procurement/[id] - Update status */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;
    const existing = await prisma.procurementRequest.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Procurement request not found");
    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status as ProcurementStatus;
      if (status === "APPROVED") { updateData.approvedById = user.userId; }
    }
    if (notes !== undefined) updateData.notes = notes;
    const req = await prisma.procurementRequest.update({ where: { id }, data: updateData, include: { requestedBy: { select: { fullName: true } }, approvedBy: { select: { fullName: true } } } });
    return successResponse(req, "Procurement request updated");
  } catch (error) {
    console.error("Update procurement error:", error);
    return errorResponse("Failed to update procurement request");
  }
}

/** DELETE /api/procurement/[id] */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const { id } = await params;
    const existing = await prisma.procurementRequest.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Procurement request not found");
    await prisma.procurementRequest.delete({ where: { id } });
    return successResponse(null, "Procurement request deleted");
  } catch (error) {
    console.error("Delete procurement error:", error);
    return errorResponse("Failed to delete procurement request");
  }
}