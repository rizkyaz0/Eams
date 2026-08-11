// app/api/stock-opname/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole } from "@prisma/client";

/** GET /api/stock-opname/[id] - Get session with items */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const { id } = await params;
    const session = await prisma.stockOpname.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { asset: { select: { id: true, name: true, tagNumber: true, location: { select: { name: true } } } } } },
      },
    });
    if (!session) return notFoundResponse("Stock opname not found");
    return successResponse(session);
  } catch (error) {
    console.error("Get stock opname detail error:", error);
    return errorResponse("Failed to fetch stock opname");
  }
}

/** PATCH /api/stock-opname/[id] - Update session status / complete */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;
    const existing = await prisma.stockOpname.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Stock opname not found");
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (status === "COMPLETED") updateData.endDate = new Date();
    const session = await prisma.stockOpname.update({ where: { id }, data: updateData });
    return successResponse(session, "Stock opname updated");
  } catch (error) {
    console.error("Update stock opname error:", error);
    return errorResponse("Failed to update stock opname");
  }
}

/** DELETE /api/stock-opname/[id] */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const { id } = await params;
    const existing = await prisma.stockOpname.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Stock opname not found");
    await prisma.stockOpname.delete({ where: { id } });
    return successResponse(null, "Stock opname deleted");
  } catch (error) {
    console.error("Delete stock opname error:", error);
    return errorResponse("Failed to delete stock opname");
  }
}