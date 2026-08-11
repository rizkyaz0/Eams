// app/api/asset-loans/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole, LoanStatus, AssetStatus } from "@prisma/client";

/** PATCH /api/asset-loans/[id] - Approve / reject / return */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;
    const existing = await prisma.assetLoan.findUnique({ where: { id }, include: { asset: true } });
    if (!existing) return notFoundResponse("Loan not found");

    const updateData: Record<string, unknown> = { status: status as LoanStatus };

    if (status === "APPROVED") {
      updateData.approvedById = user.userId;
      updateData.approvedAt = new Date();
      // Set asset to IN_USE + assign holder
      await prisma.asset.update({ where: { id: existing.assetId }, data: { status: AssetStatus.IN_USE, holderId: existing.borrowerId } });
    } else if (status === "REJECTED") {
      updateData.approvedById = user.userId;
      updateData.approvedAt = new Date();
    } else if (status === "RETURNED") {
      updateData.returnDate = new Date();
      // Set asset back to AVAILABLE + clear holder
      await prisma.asset.update({ where: { id: existing.assetId }, data: { status: AssetStatus.AVAILABLE, holderId: null } });
    }

    const loan = await prisma.assetLoan.update({ where: { id }, data: updateData, include: { asset: { select: { name: true, tagNumber: true } }, borrower: { select: { fullName: true } }, approvedBy: { select: { fullName: true } } } });
    return successResponse(loan, `Loan ${status.toLowerCase()}`);
  } catch (error) {
    console.error("Update asset loan error:", error);
    return errorResponse("Failed to update loan");
  }
}

/** DELETE /api/asset-loans/[id] */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const { id } = await params;
    const existing = await prisma.assetLoan.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Loan not found");
    if (existing.status === "ACTIVE" || existing.status === "APPROVED") return errorResponse("Cannot delete an active/approved loan", 400);
    await prisma.assetLoan.delete({ where: { id } });
    return successResponse(null, "Loan deleted");
  } catch (error) {
    console.error("Delete asset loan error:", error);
    return errorResponse("Failed to delete loan");
  }
}