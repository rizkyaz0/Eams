// app/api/stock-opname/[id]/items/route.ts
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/security";
import prisma from "@/lib/db";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { UserRole, AssetCondition } from "@prisma/client";

/** PATCH /api/stock-opname/[id]/items - Check an item (update actual condition/location/isFound) */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(UserRole.STAFF_ASSET);
  if (response) return response;
  try {
    const { id } = await params;
    const body = await request.json();
    const { itemId, actualCondition, actualLocation, isFound, notes } = body;
    if (!itemId) return errorResponse("Item ID is required", 400);

    const item = await prisma.stockOpnameItem.findUnique({ where: { id: itemId } });
    if (!item || item.stockOpnameId !== id) return notFoundResponse("Item not found in this session");

    const updated = await prisma.stockOpnameItem.update({
      where: { id: itemId },
      data: {
        actualCondition: actualCondition as AssetCondition | null | undefined,
        actualLocation: actualLocation || null,
        isFound: isFound !== undefined ? isFound : null,
        notes: notes !== undefined ? notes : item.notes,
        checkedAt: new Date(),
        checkedById: user.userId,
      },
      include: { asset: { select: { id: true, name: true, tagNumber: true } } },
    });
    return successResponse(updated, "Item checked");
  } catch (error) {
    console.error("Check stock opname item error:", error);
    return errorResponse("Failed to check item");
  }
}