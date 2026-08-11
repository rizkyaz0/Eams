// app/api/asset-loans/route.ts
import { NextRequest } from "next/server";
import { requireRole, requireUser } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { UserRole, LoanStatus } from "@prisma/client";

/** GET /api/asset-loans */
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const loans = await prisma.assetLoan.findMany({
      where: status ? { status: status as LoanStatus } : undefined,
      include: {
        asset: { select: { id: true, name: true, tagNumber: true } },
        borrower: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(loans);
  } catch (error) {
    console.error("Get asset loans error:", error);
    return errorResponse("Failed to fetch asset loans");
  }
}

/** POST /api/asset-loans - Create a loan request */
export async function POST(request: NextRequest) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const body = await request.json();
    const { assetId, borrowerId, startDate, endDate, notes } = body;
    if (!assetId || !borrowerId || !startDate || !endDate) return errorResponse("Asset, borrower, start and end dates are required", 400);
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return errorResponse("Asset not found", 404);
    if (asset.status === "IN_USE" || asset.status === "IN_MAINTENANCE") return errorResponse("Asset is not available for loan", 400);
    const loan = await prisma.assetLoan.create({
      data: { assetId, borrowerId, startDate: new Date(startDate), endDate: new Date(endDate), notes: notes || null, status: "PENDING" },
      include: { asset: { select: { name: true, tagNumber: true } }, borrower: { select: { fullName: true } } },
    });
    return successResponse(loan, "Loan request created", 201);
  } catch (error) {
    console.error("Create asset loan error:", error);
    return errorResponse("Failed to create loan request");
  }
}